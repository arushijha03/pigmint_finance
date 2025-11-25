import os
import logging
from datetime import datetime

from flask import Flask, request, jsonify
import psycopg2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analytics-service")

app = Flask(__name__)

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 5432))
DB_NAME = os.environ.get("DB_NAME", "pigmint_data")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")


def get_db_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


@app.route("/ready", methods=["GET"])
def ready():
    """
    API NAME: GET /ready
    MICROSERVICE: analytics-service
    TOPIC/SUB: none
    DB TABLES: none
    """
    return "OK", 200


@app.route("/internal/analytics/spend/categories", methods=["GET"])
def spend_by_category():
    """
    API NAME: GET /internal/analytics/spend/categories
    MICROSERVICE: analytics-service
    TOPIC/SUB: none
    DB TABLES (read): transactions
    """
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    period = request.args.get("period", "this_month")

    conn = get_db_conn()
    cur = conn.cursor()

    if period == "this_month":
        cur.execute(
            """
            SELECT category_normalized, COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
              AND date_trunc('month', timestamp) = date_trunc('month', NOW())
            GROUP BY category_normalized;
            """,
            (user_id,),
        )
    elif period == "this_week":
        cur.execute(
            """
            SELECT category_normalized, COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
              AND date_trunc('week', timestamp) = date_trunc('week', NOW())
            GROUP BY category_normalized;
            """,
            (user_id,),
        )
    else:
        cur.execute(
            """
            SELECT category_normalized, COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
            GROUP BY category_normalized;
            """,
            (user_id,),
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    categories = []
    for cat, total in rows:
        categories.append({"category": cat, "total": float(total)})

    return jsonify({"user_id": user_id, "period": period, "categories": categories})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
