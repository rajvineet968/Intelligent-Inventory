from groq import Groq
import mysql.connector
from pymongo import MongoClient
from statistics import mean
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

# ---------------- GROQ ----------------
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ---------------- MYSQL ----------------
mysql_conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DB")
)
mysql_cursor = mysql_conn.cursor(dictionary=True)

# ---------------- MONGO ----------------
mongo = MongoClient("mongodb://localhost:27017")
db = mongo["inventory"]
collection = db["llm_insights"]
collection.delete_many({})

mysql_cursor.execute("""
SELECT 
    fs.ProductID,
    AVG(fs.PredictedDemand) AS avg_demand
FROM forecast_summary fs
GROUP BY fs.ProductID
""")

rows = mysql_cursor.fetchall()

for r in rows:
    pid = r["ProductID"]
    avg_demand = round(r["avg_demand"])

    prompt = prompt = f"""
You are an inventory assistant.

Product ID: {pid}
Average daily demand: {avg_demand}

Give:
- ONE short demand insight (max 20 words)
- ONE stock action (max 10 words)

Format:
Insight: <text>
Action: <text>
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    explanation = response.choices[0].message.content

    collection.insert_one({
        "product_id": pid,
        "avg_predicted_demand": avg_demand,
        "model_used": "SARIMA",
        "llm_summary": explanation,
        "created_at": datetime.utcnow()
    })

mysql_cursor.close()
mysql_conn.close()
mongo.close()

print("✅ LLM insights generated using Llama 3.3 70B (Groq)")
