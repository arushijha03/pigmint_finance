# rules_engine/main.py
# Cloud Function (Gen 2) triggered by Pub/Sub event for transaction validation.

import os
import json
import base64
from google.cloud import pubsub_v1
import redis

# --- Configuration ---
# Note: Using PROJECT_ID instead of GCP_PROJECT for consistent environment variable naming
PROJECT_ID = os.environ.get('PROJECT_ID') 
RECOMMENDATIONS_TOPIC = os.environ.get("RECOMMENDATIONS_TOPIC") # recommendations topic name
REDIS_HOST = os.environ.get('REDIS_HOST')
REDIS_PORT = 6379

# Lazy Initialization Globals
publisher_client = None
topic_path_client = None
redis_client = None


def get_publisher_client():
    """Initializes and returns the cached Pub/Sub publisher client."""
    global publisher_client
    global topic_path_client
    
    if publisher_client is None:
        if not PROJECT_ID or not RECOMMENDATIONS_TOPIC:
            raise ValueError("Pub/Sub configuration environment variables are missing.")

        print("Lazily initializing Pub/Sub Publisher...")
        try:
            publisher_client = pubsub_v1.PublisherClient()
            # Use the environment variable to get the topic name
            topic_path_client = publisher_client.topic_path(PROJECT_ID, RECOMMENDATIONS_TOPIC)
            print(f"Pub/Sub Publisher initialized for topic: {RECOMMENDATIONS_TOPIC}")
        except Exception as e:
            print(f"FATAL ERROR initializing recommendations publisher: {e}")
            raise
        
    return publisher_client, topic_path_client


def get_redis_client():
    """Initializes and returns the cached Redis client."""
    global redis_client
    
    if redis_client is None:
        if not REDIS_HOST:
            raise ValueError("REDIS_HOST environment variable is missing.")

        print(f"Lazily connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
        try:
            redis_client = redis.Redis(
                host=REDIS_HOST, 
                port=REDIS_PORT, 
                decode_responses=True, 
                connect_timeout=5, 
                socket_timeout=5
            )
            # Ping Redis once to confirm connection is available on first call
            redis_client.ping()
            print("Successfully connected to Redis.")
        except Exception as e:
            # Raise exception to ensure the message is retried/sent to DLQ
            print(f"CRITICAL: Failed to connect or ping Redis: {e}")
            raise
        
    return redis_client


def rules_engine_validator(event):
    """
    Background Cloud Function to validate transaction data (Pub/Sub message).
    """
    if not event.get('data'):
        print("No data field found in Pub/Sub message event. Returning successfully.")
        return

    try:
        # 1. Decode the Pub/Sub data payload
        pubsub_message_data = base64.b64decode(event['data']).decode('utf-8')
        transaction = json.loads(pubsub_message_data)

        user_id = transaction.get("user_id")
        amount = transaction.get("amount")

        if user_id is None or amount is None:
            print(f"ERROR: Missing user_id or amount in decoded message: {transaction}. Retrying.")
            # Raising an error ensures the message is retried/sent to DLQ
            raise ValueError("Missing required fields in transaction data.")

        print(f"Processing transaction for User: {user_id}, Amount: ${amount}")

        # 2. Lazy Initialization of Redis (happens on first call)
        r = get_redis_client()
        
        # --- Transaction Rules and Aggregation (Day 3 Logic) ---
        
        # Get historical count and total amount for the user
        count_key = f"user:{user_id}:count"
        amount_key = f"user:{user_id}:total_amount"

        # Atomically update the user's transaction count and total amount
        current_count = r.incr(count_key)
        new_total_amount = r.incrbyfloat(amount_key, amount)

        recommendation = {
            "user_id": user_id,
            "transaction_id": transaction.get('id', 'N/A'),
            "status": "APPROVED",
            "message": f"Transaction approved. Total transactions: {current_count}, Total spend: ${new_total_amount:.2f}."
        }

        # Example Rule 1: High Value Transaction
        if amount > 500.00:
            recommendation['status'] = "REVIEW"
            recommendation['message'] = "High-value transaction detected. Flagged for manual review."

        # Example Rule 2: Frequent Spender Threshold (e.g., more than 5 transactions and over $1000 total)
        elif current_count > 5 and new_total_amount > 1000.00:
            recommendation['status'] = "ALERT"
            recommendation['message'] = "Frequent, high-volume spender detected. Flagged for potential premium service recommendation."

        print(f"Final Recommendation for {user_id}: {recommendation['status']}")

        # 3. Publish the recommendation
        publisher, topic_path = get_publisher_client()
            
        rec_str = json.dumps(recommendation)
        rec_bytes = rec_str.encode("utf-8")
        
        publisher.publish(topic_path, rec_bytes)
        print(f"Recommendation publish initiated for user {user_id}.")

    except Exception as e:
        print(f"CRITICAL EXECUTION FAILURE: An unhandled exception occurred during transaction processing: {e}")
        # Raising the exception ensures Pub/Sub retries the message delivery (and uses the DLQ)
        raise