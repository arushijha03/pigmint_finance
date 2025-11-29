import os
import json
import logging
from datetime import datetime

from flask import Flask, request, jsonify
from google.cloud import pubsub_v1
from dotenv import load_dotenv
import psycopg2
import redis
from flask_cors import CORS 


PROJECT_ID = os.environ.get("PROJECT_ID")
TRANSACTIONS_TOPIC = os.environ.get("TRANSACTIONS_TOPIC")  

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 5432))
DB_NAME = os.environ.get("DB_NAME", "pigmint_data")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

DEMO_USER_ID = "demo_user" 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api-gateway")
load_dotenv() 

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},  
    supports_credentials=False,
)

_pubsub_publisher = None
_pubsub_topic_path = None
_redis_client = None


def get_pubsub_publisher():
    global _pubsub_publisher, _pubsub_topic_path
    if _pubsub_publisher is None:
        if not PROJECT_ID or not TRANSACTIONS_TOPIC:
            raise RuntimeError("PROJECT_ID or TRANSACTIONS_TOPIC not set in env")
        _pubsub_publisher = pubsub_v1.PublisherClient()
        _pubsub_topic_path = _pubsub_publisher.topic_path(PROJECT_ID, TRANSACTIONS_TOPIC)
        logger.info(f"Pub/Sub publisher initialized for topic {_pubsub_topic_path}")
    return _pubsub_publisher, _pubsub_topic_path


import os

print("ENV DEBUG:", {
    "DB_HOST": os.environ.get("DB_HOST"),
    "DB_NAME": os.environ.get("DB_NAME"),
    "DB_USER": os.environ.get("DB_USER"),
    "DB_PORT": os.environ.get("DB_PORT"),
})


print(f"[BOOT] DB_HOST={DB_HOST}, DB_PORT={DB_PORT}, DB_NAME={DB_NAME}, DB_USER={DB_USER}") #remove

def get_db_conn():
    if not DB_HOST or not DB_NAME or not DB_USER or not DB_PASSWORD:#remove
        raise RuntimeError("DB env vars missing")#remove
    print(f"[get_db_conn] Connecting to {DB_HOST}:{DB_PORT}, db={DB_NAME}, user={DB_USER}")#remove
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    return conn


def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
        )
    return _redis_client

@app.route("/ready", methods=["GET"])
def ready():
    """
    API NAME: GET /ready
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES: none
    """
    return "OK", 200



@app.route("/api/me", methods=["GET"])
def get_me():
    """
    API NAME: GET /api/me
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (read): users (optional)
    """
    
    return jsonify(
        {
            "user_id": DEMO_USER_ID,
            "email": "demo@pigmint.local",
            "total_saved": _get_user_total_saved(DEMO_USER_ID),
        }
    )


def _get_user_total_saved(user_id: str) -> float:
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT COALESCE(total_saved, 0) FROM users WHERE id = %s", (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return float(row[0])
    except Exception as e:
        logger.error(f"Error reading total_saved for {user_id}: {e}")
    return 0.0


@app.route("/api/transactions/simulate", methods=["POST"])
def simulate_transaction():
    """
    API NAME: POST /api/transactions/simulate
    MICROSERVICE: api-gateway
    TOPIC/SUB: publishes to TRANSACTIONS_TOPIC (e.g. 'transactions.raw')
    DB TABLES: none directly (event-processor will write to transactions, savings_ledger, etc.)
    """
    body = request.get_json() or {}
    try:
        amount = float(body["amount"])
        merchant = body.get("merchant", "Unknown")
        category = body.get("category", "Uncategorized")
        timestamp = body.get("timestamp") or datetime.utcnow().isoformat()

        transaction_event = {
            "user_id": DEMO_USER_ID,
            "amount": amount,
            "currency": "USD",
            "merchant": merchant,
            "category": category,
            "timestamp": timestamp,
            "source": "simulator",
        }

        publisher, topic_path = get_pubsub_publisher()
        data_str = json.dumps(transaction_event)
        future = publisher.publish(topic_path, data=data_str.encode("utf-8"))
        message_id = future.result()

        logger.info(f"Published transaction event to {topic_path}: {transaction_event}")

        return jsonify({"status": "queued", "message_id": message_id}), 200
    except KeyError as e:
        return jsonify({"error": f"Missing field: {str(e)}"}), 400
    except Exception as e:
        logger.exception("Error publishing transaction event")
        return jsonify({"error": str(e)}), 500


@app.route("/api/transactions/recent", methods=["GET"])
def get_recent_transactions():
    """
    API NAME: GET /api/transactions/recent
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (read): transactions, savings_ledger
    """
    print(">>> handler: /api/transactions/recent entered", flush=True)
    limit = int(request.args.get("limit", 20))
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT t.id, t.amount, t.currency, t.merchant, t.category_normalized,
               t.timestamp,
               COALESCE(SUM(s.amount), 0) AS pigmint_action_total
        FROM transactions t
        LEFT JOIN savings_ledger s ON s.transaction_id = t.id
        WHERE t.user_id = %s
        GROUP BY t.id
        ORDER BY t.timestamp DESC
        LIMIT %s;
        """,
        (DEMO_USER_ID, limit),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    txs = []
    for r in rows:
        txs.append(
            {
                "transaction_id": r[0],
                "amount": float(r[1]),
                "currency": r[2],
                "merchant": r[3],
                "category": r[4],
                "timestamp": r[5].isoformat() if hasattr(r[5], "isoformat") else r[5],
                "pigmint_action_total": float(r[6]),
            }
        )
    return jsonify({"transactions": txs})



@app.route("/api/goals", methods=["GET"])
def get_goals():
    """
    API NAME: GET /api/goals
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (read): goals
    """
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, target_amount, current_amount, deadline
        FROM goals
        WHERE user_id = %s
        ORDER BY created_at ASC;
        """,
        (DEMO_USER_ID,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    goals = []
    for r in rows:
        goals.append(
            {
                "goal_id": r[0],
                "name": r[1],
                "target_amount": float(r[2]),
                "current_amount": float(r[3]),
                "deadline": r[4].isoformat() if r[4] else None,
            }
        )
    return jsonify({"goals": goals})


@app.route("/api/goals", methods=["POST"])
def create_goal():
    """
    API NAME: POST /api/goals
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (write): goals
    """
    body = request.get_json() or {}
    name = body.get("name")
    target_amount = body.get("target_amount")

    if not name or target_amount is None:
        return jsonify({"error": "name and target_amount are required"}), 400

    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO goals (user_id, name, target_amount, current_amount, created_at)
        VALUES (%s, %s, %s, 0, NOW())
        RETURNING id;
        """,
        (DEMO_USER_ID, name, float(target_amount)),
    )
    goal_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"goal_id": goal_id, "status": "created"}), 201



@app.route("/api/rules", methods=["GET"])
def get_rules():
    """
    API NAME: GET /api/rules
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (read): rules
    REDIS: rules:<user_id>
    """
    r = get_redis()
    cached = r.get(f"rules:{DEMO_USER_ID}")
    if cached:
        rules = json.loads(cached)
    else:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT name, is_active, config FROM rules WHERE user_id = %s",
            (DEMO_USER_ID,),
        )
        rules = {}
        for name, is_active, config in cur.fetchall():
            rules[name] = {
                "is_active": is_active,
                "config": config or {},
            }
        cur.close()
        conn.close()
        r.set(f"rules:{DEMO_USER_ID}", json.dumps(rules), ex=300)

    return jsonify({"rules": rules})


@app.route("/api/rules/roundup", methods=["POST"])
def toggle_roundup():
    """
    API NAME: POST /api/rules/roundup
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (write): rules
    REDIS: rules:<user_id>
    """
    body = request.get_json() or {}
    enabled = body.get("enabled")
    if enabled is None:
        return jsonify({"error": "enabled must be true/false"}), 400

    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO rules (user_id, name, is_active, config, updated_at)
        VALUES (%s, 'roundup', %s, '{}'::jsonb, NOW())
        ON CONFLICT (user_id, name)
        DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW();
        """,
        (DEMO_USER_ID, bool(enabled)),
    )
    conn.commit()
    cur.close()
    conn.close()

   
    r = get_redis()
    r.delete(f"rules:{DEMO_USER_ID}")  

    return jsonify({"rule": "roundup", "enabled": bool(enabled)}), 200



@app.route("/api/recommendations/latest", methods=["GET"])
def latest_recommendation():
    """
    API NAME: GET /api/recommendations/latest
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (read): recommendations
    """
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, title, message, category, created_at
        FROM recommendations
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 1;
        """,
        (DEMO_USER_ID,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return jsonify({"recommendation": None})

    rec = {
        "id": row[0],
        "title": row[1],
        "message": row[2],
        "category": row[3],
        "created_at": row[4].isoformat() if row[4] else None,
    }
    return jsonify({"recommendation": rec})



@app.route("/api/dashboard/overview", methods=["GET"])
def dashboard_overview():
    """
    API NAME: GET /api/dashboard/overview
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES (read): users, goals, recommendations
                      (analytics_service for spend/categories)
    """
    total_saved = _get_user_total_saved(DEMO_USER_ID)

    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, target_amount, current_amount
        FROM goals
        WHERE user_id = %s
        ORDER BY created_at ASC;
        """,
        (DEMO_USER_ID,),
    )
    goals = []
    for r in cur.fetchall():
        goals.append(
            {
                "goal_id": r[0],
                "name": r[1],
                "target_amount": float(r[2] or 0.0),
                "current_amount": float(r[3] or 0.0),
            }
        )


    cur.execute(
        """
        SELECT title, message, category, created_at
        FROM recommendations
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 1;
        """,
        (DEMO_USER_ID,),
    )
    rec_row = cur.fetchone()
    cur.close()
    conn.close()

    latest_rec = None
    if rec_row:
        latest_rec = {
            "title": rec_row[0],
            "message": rec_row[1],
            "category": rec_row[2],
            "created_at": rec_row[3].isoformat() if rec_row[3] else None,
        }


    return jsonify(
        {
            "total_saved": total_saved,
            "goals": goals,
            "latest_recommendation": latest_rec,
        }
    )


ANALYTICS_BASE_URL = os.environ.get(
    "ANALYTICS_BASE_URL", "http://analytics-service:8080"
)

import requests  

@app.route("/api/spend/categories", methods=["GET"])
def spend_categories():
    """
    API NAME: GET /api/spend/categories
    MICROSERVICE: api-gateway
    TOPIC/SUB: none
    DB TABLES: via analytics_service (transactions)
    """
    period = request.args.get("period", "this_month")
    try:
        resp = requests.get(
            f"{ANALYTICS_BASE_URL}/internal/analytics/spend/categories",
            params={"user_id": DEMO_USER_ID, "period": period},
            timeout=5,
        )
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        logger.error(f"Error calling analytics_service: {e}")
        return jsonify({"error": "analytics_service_unavailable"}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
