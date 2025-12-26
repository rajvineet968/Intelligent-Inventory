import mysql.connector
import pandas as pd
import joblib
from statsmodels.tsa.statespace.sarimax import SARIMAX
import os
from dotenv import load_dotenv
load_dotenv()

# ---------------- DB CONFIG ----------------
conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DB")
)

query = """
SELECT 
    i.InvoiceDate,
    ii.ProductID,
    SUM(ii.Quantity) AS demand
FROM invoices i
JOIN invoice_items ii ON i.InvoiceID = ii.InvoiceID
GROUP BY i.InvoiceDate, ii.ProductID
ORDER BY i.InvoiceDate
"""

df = pd.read_sql(query, conn)
conn.close()

models = {}

for pid in df["ProductID"].unique():
    series = (
    df[df["ProductID"] == pid]
    .set_index("InvoiceDate")["demand"]
    .sort_index()
    .asfreq("D", fill_value=0)
)


    # SARIMA training (THIS IS THE TRAINING STEP)
    model = SARIMAX(
        series,
        order=(1,1,1),
        seasonal_order=(1,1,1,7),
        enforce_stationarity=False,
        enforce_invertibility=False
    )

    fitted = model.fit(disp=False)
    models[pid] = fitted

joblib.dump(models, "ml/sarima_models.pkl")

print("✅ SARIMA models trained and saved")
