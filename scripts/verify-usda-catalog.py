#!/usr/bin/env python3
"""Verify the sourced offline entries against the pinned USDA SR28 input files.

Usage: python3 scripts/verify-usda-catalog.py /path/to/usda-sqlite/data
No network calls or application/user data are needed.
"""
import csv
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
expected = {
    "FOOD_DES.txt": "bb2047218cdad1d830da69e760386409fde3b7afabceae604c5479f280d4fa2e",
    "NUT_DATA.txt": "506c9ee39a276ac8f53565d270597e430944ec3363adb53a91cc6ee8c061fac5",
}
for name, checksum in expected.items():
    if hashlib.sha256((root / name).read_bytes()).hexdigest() != checksum:
        raise ValueError(f"{name}: source differs from the pinned SR28 files")
nutrients = {}
with (root / "NUT_DATA.txt").open(encoding="latin1") as handle:
    for row in csv.reader(handle, delimiter="^", quotechar="~"):
        if row[1] in {"208", "203", "205", "204", "291"}:
            nutrients.setdefault(row[0], {})[row[1]] = float(row[2])
catalog = Path(__file__).resolve().parents[1] / "src/data"
foods = [food for filename in ["starter-foods.json", "indian-foods.json"]
         for food in json.loads((catalog / filename).read_text())]
for food in foods:
    for field, nutrient in {"kcal": "208", "protein": "203", "carbs": "205", "fat": "204", "fiber": "291"}.items():
        if food[field] != nutrients[food["sourceId"]][nutrient]:
            raise ValueError(f"{food['id']}: {field} differs from the source")
print(f"Verified {len(foods)} food entries against checksum-verified USDA SR28 files.")
