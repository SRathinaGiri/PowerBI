"""Build the data quality practice workbook. All data is synthetic, with a fixed seed.

Needs openpyxl, because the output must be a real Excel file for Power Query practice.
Amounts are whole rupees, so no binary floats are involved.
"""
import random
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook

OUT = Path(__file__).resolve().parent.parent / "assets/resources/PBI_DataQualityPractice.xlsx"
rng = random.Random(42)

customers = [[f"C{i:03d}", f"Test Trader {i:02d}", rng.choice(["Chennai", "Mumbai", "Pune", "Kochi"])] for i in range(1, 13)]
products = [[f"P{i:02d}", f"Sample Product {i}", rng.choice([150, 240, 375, 500, 820])] for i in range(1, 9)]
price = {p[0]: p[2] for p in products}

clean = []
for i in range(1, 61):
    # Every fifth invoice goes to C005, so its duplicate customer row has a visible effect.
    cust = "C005" if i % 5 == 0 else rng.choice([c[0] for c in customers])
    prod = rng.choice(list(price))
    qty = rng.randint(1, 12)
    # FY 2025-26 (April to March).
    clean.append([f"INV-{i:04d}", date(2025, 4, 1) + timedelta(days=rng.randrange(365)), cust, prod, qty, qty * price[prod]])
clean_total = sum(r[5] for r in clean)

sales = [list(r) for r in clean]
for i, key in ((4, "C003 "), (11, "c007"), (19, " C010")):
    sales[i][2] = key
orphans = (25, 40)
for i in orphans:
    sales[i][2] = "C099"
sales[33][3] = None
for i in (8, 17):
    sales[i][5] = f"{sales[i][5]:,}"
sales[22][1] = sales[22][1].strftime("%d-%m-%Y")
sales.insert(50, list(sales[49]))
dup_amount = clean[49][5]
# Counted after the faults are planted, because some of them replace C005 keys.
c005_rows = sum(r[2] == "C005" for r in sales)


def inr(n: int) -> str:
    s = str(n)
    if len(s) <= 3:
        return f"₹{s}"
    head, parts = s[:-3], []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    parts.insert(0, head)
    return "₹" + ",".join(parts + [s[-3:]])


customers_dirty = customers + [["C005", customers[4][1], "Madurai"]]
bridge = [[f"INV-{i:04d}", f"S{(i % 4) + 1}"] for i in range(1, 21)] + [["INV-0003", "S1"], ["INV-0007", "S2"], ["INV-0011", "S4"]]
bridge[20] = ["INV-0003", bridge[2][1]]
bridge[21] = ["INV-0007", bridge[6][1]]
bridge[22] = ["INV-0011", "S2"]

key = [
    ["Check", "What you should find", "Fix"],
    ["Rows in Sales", len(sales), "Start here, and reconcile after every step"],
    ["Exact duplicate rows in Sales", f"1 ({clean[49][0]}, {inr(dup_amount)})", "Remove duplicates on the whole row"],
    ["Keys with stray spaces or wrong case", "3 rows", "Trim, then Uppercase, before merging"],
    ["Customer keys not in Customers", f"{len(orphans)} rows (C099)", "Report them, do not delete them. They appear as a blank in visuals"],
    ["Null ProductID", "1 row (INV-0034)", "Ask the source owner. The sale still counts"],
    ["Amounts stored as text", "2 rows", "Remove the commas, change type to whole number"],
    ["Dates stored as text", "1 row (INV-0023)", "Parse as DD-MM-YYYY using locale English (India)"],
    ["Duplicate key in Customers", "C005 appears twice", "A merge doubles its rows. Decide which city is right"],
    ["Rows if merged before fixing C005", f"{len(sales) + c005_rows}", "Compare with the row count before the merge"],
    ["Duplicate pairs in InvoiceSalesperson", "2 pairs (INV-0003, INV-0007)", "Remove duplicates before using it as a bridge"],
    ["Invoice with two salespersons", "INV-0011", "Legitimate, so it stays. This is why the bridge exists"],
    ["Final clean rows in Sales", len(clean), ""],
    ["Final clean total", inr(clean_total), "Your total must equal this"],
]

wb = Workbook()
ws = wb.active
ws.title = "ReadMe"
for line in (
    ["Data quality practice. All names and numbers are synthetic."],
    ["Load Sales, Customers, Products and InvoiceSalesperson into Power Query. Find and fix the flaws, then reconcile."],
    ["Try before opening the Answer key sheet."],
):
    ws.append(line)
for title, head, rows in (
    ("Sales", ["InvoiceNo", "InvoiceDate", "CustomerID", "ProductID", "Qty", "Amount"], sales),
    ("Customers", ["CustomerID", "CustomerName", "City"], customers_dirty),
    ("Products", ["ProductID", "ProductName", "Price"], products),
    ("InvoiceSalesperson", ["InvoiceNo", "SalespersonID"], bridge),
    ("Answer key", key[0], key[1:]),
):
    s = wb.create_sheet(title)
    s.append(head)
    for r in rows:
        s.append(r)
    if title == "Sales":
        for cell in s["B"][1:]:
            cell.number_format = "DD-MM-YYYY"
    for col in s.columns:
        s.column_dimensions[col[0].column_letter].width = max(len(str(c.value or "")) for c in col) + 2
wb.save(OUT)
print(f"{OUT.name}: {len(sales)} rows, clean total {clean_total:,}, merged rows {len(sales) + c005_rows}, C005 rows {c005_rows}")
