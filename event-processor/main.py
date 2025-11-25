import os
import json
import base64
import logging
import math
from datetime import datetime

from flask import Flask, request, jsonify
import psycopg2
import redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("event-processor")

app = Flask(__name__)

# ---------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 5432))
DB_NAME = os.environ.get("DB_NAME", "pigmint_data")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

DEMO_USER_ID = "demo_user"

_redis_client = None


def get_db_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
        )
    return _redis_client


# ---------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------

@app.route("/ready", methods=["GET"])
def ready():
    """
    API NAME: GET /ready
    MICROSERVICE: event-processor
    TOPIC/SUB: none
    DB TABLES: none
    """
    return "OK", 200


# ---------------------------------------------------------------------
# PUB/SUB PUSH HANDLER
# ---------------------------------------------------------------------

@app.route("/internal/pubsub/transactions", methods=["POST"])
def handle_pubsub_transaction():
    """
    API NAME: POST /internal/pubsub/transactions
    MICROSERVICE: event-processor
    TOPIC/SUB: subscription 'transactions.raw-sub' (push from TRANSACTIONS_TOPIC)
    DB TABLES (write): transactions, savings_ledger, users, goals, goal_progress, recommendations
    """
    envelope = request.get_json()
    if not envelope or "message" not in envelope:
        logger.error("Invalid Pub/Sub push request: no message field")
        return "Bad Request: no message", 400

    message = envelope["message"]

    data = message.get("data")
    if data is None:
        logger.error("Pub/Sub message missing data")
        return "Bad Request: no data", 400

    try:
        payload_bytes = base64.b64decode(data)
        tx = json.loads(payload_bytes.decode("utf-8"))
        logger.info(f"Received transaction event: {tx}")
    except Exception as e:
        logger.exception("Failed to decode Pub/Sub data")
        return "Bad Request: corrupt data", 400

    try:
        process_transaction_event(tx)
        return "", 200
    except Exception as e:
        logger.exception("Error processing transaction event")
        # Non-2xx will cause Pub/Sub to retry
        return "Internal Server Error", 500


# ---------------------------------------------------------------------
# CORE PIPELINE: transaction + rules + recommendations
# ---------------------------------------------------------------------

def process_transaction_event(tx: dict):
    """
    Handles a single normalized transaction event:
    1. Insert into transactions table.
    2. Fetch rules (from Redis/DB).
    3. Apply savings rules (round-up).
    4. Update savings_ledger, users.total_saved, goals/current_amount.
    5. Generate deterministic recommendations.
    """
    user_id = tx.get("user_id", DEMO_USER_ID)
    amount = float(tx.get("amount", 0.0))
    currency = tx.get("currency", "USD")
    merchant = tx.get("merchant", "Unknown")
    category_raw = tx.get("category", "Uncategorized")
    timestamp_str = tx.get("timestamp") or datetime.utcnow().isoformat()

    try:
        timestamp = datetime.fromisoformat(timestamp_str)
    except Exception:
        timestamp = datetime.utcnow()

    category_normalized = normalize_category(category_raw)

    conn = get_db_conn()
    cur = conn.cursor()

    # 1. Insert transaction
    cur.execute(
        """
        INSERT INTO transactions (user_id, amount, currency, merchant,
                                  category_raw, category_normalized, timestamp, source, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id;
        """,
        (user_id, amount, currency, merchant, category_raw, category_normalized, timestamp, tx.get("source", "simulator")),
    )
    tx_id = cur.fetchone()[0]
    logger.info(f"Inserted transaction {tx_id}")

    # 2. Load rules
    rules = load_rules_for_user(user_id, conn)

    # 3. Apply savings rules
    total_saved_this_tx = 0.0

    # Round-up rule
    roundup_rule = rules.get("roundup")
    if roundup_rule and roundup_rule.get("is_active", False):
        ru_amount = apply_roundup(amount)
        if ru_amount > 0:
            insert_savings_ledger(cur, user_id, tx_id, "roundup", ru_amount)
            total_saved_this_tx += ru_amount

    # (You can add more rules here later, e.g. coffee_savings etc.)

    # 4. Update aggregates (users.total_saved & goals.current_amount)
    if total_saved_this_tx > 0:
        cur.execute(
            """
            UPDATE users
            SET total_saved = COALESCE(total_saved, 0) + %s
            WHERE id = %s;
            """,
            (total_saved_this_tx, user_id),
        )
        # For now: apply all savings to first goal if exists
        cur.execute(
            """
            SELECT id FROM goals WHERE user_id = %s ORDER BY created_at ASC LIMIT 1;
            """,
            (user_id,),
        )
        row = cur.fetchone()
        if row:
            goal_id = row[0]
            cur.execute(
                """
                UPDATE goals
                SET current_amount = COALESCE(current_amount, 0) + %s
                WHERE id = %s;
                """,
                (total_saved_this_tx, goal_id),
            )
            # optional: goal_progress insertion
            cur.execute(
                """
                INSERT INTO goal_progress (goal_id, transaction_id, amount_added, created_at)
                VALUES (%s, %s, %s, NOW());
                """,
                (goal_id, tx_id, total_saved_this_tx),
            )

    # 5. Generate deterministic recommendation
    generate_recommendation(cur, user_id)

    conn.commit()
    cur.close()
    conn.close()
    logger.info(f"Processed transaction {tx_id} for user {user_id}")


def normalize_category(raw: str) -> str:
    raw = (raw or "").lower()
    if "coffee" in raw or "starbucks" in raw:
        return "Restaurants"
    if "grocery" in raw or "market" in raw:
        return "Groceries"
    return "Other"


def load_rules_for_user(user_id: str, conn) -> dict:
    r = get_redis()
    cache_key = f"rules:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    cur = conn.cursor()
    cur.execute(
        "SELECT name, is_active, config FROM rules WHERE user_id = %s", (user_id,)
    )
    rules = {}
    for name, is_active, config in cur.fetchall():
        rules[name] = {"is_active": is_active, "config": config or {}}
    cur.close()
    r.set(cache_key, json.dumps(rules), ex=300)
    return rules


def apply_roundup(amount: float) -> float:
    """
    Round-up rule: ceil(amount) - amount if > 0.
    """
    rounded = math.ceil(amount)
    diff = rounded - amount
    return round(diff, 2) if diff > 0 else 0.0


def insert_savings_ledger(cur, user_id: str, tx_id: int, rule_name: str, amount: float):
    cur.execute(
        """
        INSERT INTO savings_ledger (user_id, transaction_id, rule_name, amount, created_at)
        VALUES (%s, %s, %s, %s, NOW());
        """,
        (user_id, tx_id, rule_name, amount),
    )


def generate_recommendation(cur, user_id: str):
    """
    Deterministic recommendation examples:

    Rule 1 (Dining share high):
      - If Restaurants spending this month > 30% of total spending -> create a rec.

    Rule 2 (Groceries too low vs dining):
      - If Restaurants > 30% of total AND Groceries < 10% of total -> suggest cooking at home more.

    Rule 3 (Other / uncategorized too high):
      - If 'Other' category > 40% of total -> suggest reviewing discretionary / uncategorized spending.

    Rule 4 (Many small transactions):
      - If more than 20 transactions this month AND average transaction < 10 -> suggest consolidating small purchases.
    """
    # total / per-category spending and transaction count this month
    cur.execute(
        """
        WITH this_month AS (
            SELECT *
            FROM transactions
            WHERE user_id = %s
              AND date_trunc('month', timestamp) = date_trunc('month', NOW())
        )
        SELECT
            COALESCE(SUM(amount), 0) AS total_spend,
            COALESCE(SUM(CASE WHEN category_normalized = 'Restaurants' THEN amount ELSE 0 END), 0) AS restaurants_spend,
            COALESCE(SUM(CASE WHEN category_normalized = 'Groceries' THEN amount ELSE 0 END), 0) AS groceries_spend,
            COALESCE(SUM(CASE WHEN category_normalized = 'Other' THEN amount ELSE 0 END), 0) AS other_spend,
            COUNT(*)::int AS tx_count
        FROM this_month;
        """,
        (user_id,),
    )
    row = cur.fetchone()
    total_spend = float(row[0]) if row[0] is not None else 0.0
    restaurants_spend = float(row[1]) if row[1] is not None else 0.0
    groceries_spend = float(row[2]) if row[2] is not None else 0.0
    other_spend = float(row[3]) if row[3] is not None else 0.0
    tx_count = int(row[4]) if row[4] is not None else 0

    if total_spend <= 0 or tx_count <= 0:
        return

    restaurants_share = restaurants_spend / total_spend
    groceries_share = groceries_spend / total_spend
    other_share = other_spend / total_spend
    avg_amount = total_spend / tx_count

    # ------------------------------------------------------------------
    # Rule 1: Dining share high (> 30% of total)
    # ------------------------------------------------------------------
    if restaurants_share > 0.3:
        title = "Dining above recommended level"
        message = (
            f"Your Restaurants spending is {restaurants_share:.0%} of total this month. "
            "Consider lowering your dining budget."
        )
        category = "spending"

        cur.execute(
            """
            INSERT INTO recommendations (user_id, title, message, category, created_at)
            VALUES (%s, %s, %s, %s, NOW());
            """,
            (user_id, title, message, category),
        )

    # ------------------------------------------------------------------
    # Rule 2: Groceries too low while dining is high
    # ------------------------------------------------------------------
    if restaurants_share > 0.3 and groceries_share < 0.1:
        title = "Consider shifting spend to groceries"
        message = (
            f"Restaurants make up {restaurants_share:.0%} of your spending this month, "
            f"while Groceries are only {groceries_share:.0%}. "
            "Cooking at home a bit more could free up extra savings."
        )
        category = "budget_allocation"

        cur.execute(
            """
            INSERT INTO recommendations (user_id, title, message, category, created_at)
            VALUES (%s, %s, %s, %s, NOW());
            """,
            (user_id, title, message, category),
        )

    # ------------------------------------------------------------------
    # Rule 3: Other / uncategorized spending high
    # ------------------------------------------------------------------
    if other_share > 0.4:
        title = "High discretionary / uncategorized spending"
        message = (
            f"'Other' category spending is {other_share:.0%} of your total this month. "
            "Review these purchases to identify subscriptions or impulse buys you can cut back on."
        )
        category = "spending_hygiene"

        cur.execute(
            """
            INSERT INTO recommendations (user_id, title, message, category, created_at)
            VALUES (%s, %s, %s, %s, NOW());
            """,
            (user_id, title, message, category),
        )

    # ------------------------------------------------------------------
    # Rule 4: Many small transactions
    # ------------------------------------------------------------------
    if tx_count > 20 and avg_amount < 10.0:
        title = "Many small purchases detected"
        message = (
            f"You've made {tx_count} transactions this month with an average size of "
            f"${avg_amount:.2f}. Grouping small purchases or reducing impulse buys could "
            "unlock additional savings."
        )
        category = "behavior"

        cur.execute(
            """
            INSERT INTO recommendations (user_id, title, message, category, created_at)
            VALUES (%s, %s, %s, %s, NOW());
            """,
            (user_id, title, message, category),
        )



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
