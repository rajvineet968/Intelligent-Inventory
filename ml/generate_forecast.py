import mysql.connector
import joblib
from datetime import timedelta
import os
from dotenv import load_dotenv
load_dotenv()

# Load trained SARIMA models
models = joblib.load("ml/sarima_models.pkl")

# DB connection
conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DB")
)
cursor = conn.cursor(dictionary=True)

# Clear old forecasts
cursor.execute("DELETE FROM forecast_summary")
conn.commit()

# Get last invoice date
cursor.execute("SELECT MAX(InvoiceDate) AS last_date FROM invoices")
last_date = cursor.fetchone()["last_date"]

FORECAST_DAYS = 30

for product_id, model in models.items():
    forecast = model.forecast(steps=FORECAST_DAYS)

    for i, value in enumerate(forecast):
        predicted = max(0, int(float(value)))  # 🔥 FIXED CAST

        cursor.execute(
            """
            INSERT INTO forecast_summary
            (ProductID, ForecastDate, PredictedDemand, ModelUsed)
            VALUES (%s, %s, %s, %s)
            """,
            (
                int(product_id),
                last_date + timedelta(days=i + 1),
                predicted,
                "SARIMA"
            )
        )

conn.commit()
cursor.close()
conn.close()

print("✅ SARIMA forecasts generated and stored")
