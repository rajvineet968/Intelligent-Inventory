# data_generator.py
# FINAL VERSION – SAFE FOR ML + LLM PIPELINE

import random
from datetime import datetime, timedelta
import mysql.connector
import os
from dotenv import load_dotenv
load_dotenv()

# ---------------- DB CONFIG ----------------
DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST"),
    "user": os.getenv("MYSQL_USER"),
    "password": os.getenv("MYSQL_PASSWORD"),
    "database": os.getenv("MYSQL_DB")
}

START_DATE = datetime(2024, 1, 1)
END_DATE   = datetime(2025, 12, 31)

# ---------------- CONNECT ----------------
conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor(dictionary=True)

print("✅ Connected to database")

# ---------------- CLEAN TRANSACTIONAL TABLES ----------------
cursor.execute("DELETE FROM invoice_items")
cursor.execute("DELETE FROM invoices")
cursor.execute("DELETE FROM promotions")
cursor.execute("DELETE FROM holidays")
conn.commit()

print("🧹 Cleared old transactional data")

# ---------------- LOAD ML CONFIG PRODUCTS ----------------
cursor.execute("SELECT * FROM products")
ml_products = cursor.fetchall()

if not ml_products:
    raise Exception("❌ products table is EMPTY. Insert ML config data first.")

print(f"📦 ML Products Loaded: {len(ml_products)}")

# ---------------- LOAD SYSTEM PRODUCTS ----------------
cursor.execute("SELECT ProductID, StockCode FROM product")
system_products = cursor.fetchall()

product_map = {p["StockCode"]: p["ProductID"] for p in system_products}

print("🔗 Product Map:", product_map)

# ---------------- INSERT HOLIDAYS ----------------
HOLIDAYS = [
    ("2024-01-26", "Republic Day", 1.5),
    ("2024-08-15", "Independence Day", 1.5),
    ("2024-10-02", "Gandhi Jayanti", 1.4),
    ("2024-12-25", "Christmas", 1.6),
]

for h in HOLIDAYS:
    cursor.execute(
        """
        INSERT INTO holidays (HolidayDate, HolidayName, DemandMultiplier)
        VALUES (%s, %s, %s)
        """,
        h
    )

conn.commit()
print("🎉 Holidays inserted")

# ---------------- INSERT PROMOTIONS ----------------
for ml_p in ml_products:
    stockcode = ml_p["StockCode"]

    if stockcode not in product_map:
        continue

    cursor.execute(
        """
        INSERT INTO promotions (ProductID, StartDate, EndDate, PromoMultiplier)
        VALUES (%s, %s, %s, %s)
        """,
        (
            product_map[stockcode],
            datetime(2024, 7, 1).date(),
            datetime(2024, 7, 7).date(),
            1.3
        )
    )

conn.commit()
print("🏷️ Promotions inserted")

# ---------------- GENERATE SALES ----------------
current_date = START_DATE
invoice_count = 0

while current_date <= END_DATE:

    # Holiday multiplier
    cursor.execute(
        "SELECT DemandMultiplier FROM holidays WHERE HolidayDate = %s",
        (current_date.date(),)
    )
    h = cursor.fetchone()
    holiday_mult = h["DemandMultiplier"] if h else 1.0

    # ✅ ONE invoice per day
    cursor.execute(
        "INSERT INTO invoices (InvoiceDate) VALUES (%s)",
        (current_date.date(),)
    )
    invoice_id = cursor.lastrowid

    for ml_p in ml_products:
        stockcode = ml_p["StockCode"]

        if stockcode not in product_map:
            continue

        # Base demand
        base = ml_p["BaseDailyDemand"] or 5
        demand = base + random.randint(-1, 2)

        if demand <= 0:
            continue

        # Weekend boost
        if current_date.weekday() >= 5:
            demand = int(demand * 1.2)

        # Holiday boost
        demand = int(demand * holiday_mult)

        # Promotion boost
        cursor.execute(
            """
            SELECT PromoMultiplier
            FROM promotions
            WHERE ProductID = %s
              AND %s BETWEEN StartDate AND EndDate
            """,
            (product_map[stockcode], current_date.date())
        )
        promo = cursor.fetchone()
        promo_mult = promo["PromoMultiplier"] if promo else 1.0

        demand = int(demand * promo_mult)

        # Price
        price = random.uniform(
            float(ml_p["MinPrice"]),
            float(ml_p["MaxPrice"])
        )

        cursor.execute(
            """
            INSERT INTO invoice_items
            (InvoiceID, ProductID, Quantity, UnitPrice)
            VALUES (%s, %s, %s, %s)
            """,
            (
                invoice_id,
                product_map[stockcode],
                demand,
                round(price, 2)
            )
        )

    invoice_count += 1
    current_date += timedelta(days=1)

conn.commit()
cursor.close()
conn.close()

print(f"✅ DONE: Generated {invoice_count} invoices successfully")
