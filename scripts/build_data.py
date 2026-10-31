#!/usr/bin/env python3
"""Download the Meteoritical Bulletin Database and turn it into a clean GeoJSON
file for the map.

Data: the Meteoritical Society's Meteoritical Bulletin Database (MetBull),
https://www.lpi.usra.edu/meteor/. MetBull blocks scripts, so this uses a full
copy of it published on Kaggle (scraped October 2024, no login needed):
https://www.kaggle.com/datasets/sweeteyesbirb/meteoritical-bulletin-dataset
If a newer copy shows up, point SOURCE at it (or use --csv) and rerun.

Usage:
    python3 scripts/build_data.py                 # download and build
    python3 scripts/build_data.py --csv file.csv  # build from a local CSV

Only the Python standard library is needed.
"""

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

SOURCE = "https://www.kaggle.com/api/v1/datasets/download/sweeteyesbirb/meteoritical-bulletin-dataset"
CSV_NAME = "meteoritical_bulletin_data_final.csv"  # file inside the zip

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "meteorites.geojson"

# Records that are not on Earth (Meridiani Planum was found on Mars by the
# Opportunity rover) are left out of an Earth map.
NOT_ON_EARTH = {"Meridiani Planum"}

# MetBull statuses we skip: rocks that turned out not to be meteorites
# ("Pseudo"), doubtful or discredited claims, impact craters with no meteorite
# found, and records with no paperwork behind them.
SKIP_STATUS = {"Pseudo", "Doubtful", "Discredited", "Crater", "Undocumented"}

LAST_VALID_YEAR = 2026  # guards against typos in the year column


def pick(row, *names):
    """Return the first non-empty value among several possible column names."""
    for n in names:
        v = row.get(n)
        if v not in (None, "", "NA"):
            return v.strip()
    return None


def kind_of(recclass):
    """Sort the scientific class into a few groups kids can understand."""
    c = (recclass or "").lower()
    if "martian" in c:
        return "mars"
    if "lunar" in c:
        return "moon"
    if c.startswith("iron"):
        return "iron"
    if c.startswith("pallasite") or c.startswith("mesosiderite"):
        return "stony-iron"
    return "stony"


def load_csv(local_path=None):
    if local_path:
        return Path(local_path).read_text(encoding="utf-8-sig")
    print(f"Downloading {SOURCE} ...", file=sys.stderr)
    req = urllib.request.Request(SOURCE, headers={"User-Agent": "MeteoriteStrikeMap/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = resp.read()
    except Exception as e:
        raise SystemExit(f"Could not download the dataset: {e}")
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        return z.read(CSV_NAME).decode("utf-8-sig")


def build(text):
    features = []
    skipped = {"no location": 0, "not on Earth": 0, "not a real meteorite": 0}
    for row in csv.DictReader(io.StringIO(text)):
        status = pick(row, "Status") or ""
        if status in SKIP_STATUS:
            skipped["not a real meteorite"] += 1
            continue
        name = pick(row, "Name")
        lat = pick(row, "Latitude")
        lon = pick(row, "Longitude")
        if not name or lat is None or lon is None:
            skipped["no location"] += 1
            continue
        lat, lon = float(lat), float(lon)
        # 0,0 is a placeholder for "unknown location".
        if lat == 0 and lon == 0:
            skipped["no location"] += 1
            continue
        if name in NOT_ON_EARTH or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            skipped["not on Earth"] += 1
            continue

        # MetBull lists mass in kilograms; the app uses grams.
        mass = pick(row, "Mass(kg)")
        mass = round(float(mass) * 1000, 2) if mass is not None else None
        if mass is not None and mass.is_integer():
            mass = int(mass)

        year = pick(row, "Year-Only")
        year = int(year) if year and re.fullmatch(r"\d{3,4}", year) else None
        if year is not None and year > LAST_VALID_YEAR:
            year = None

        # The record ID is the "code" in MetBull's link; it matches the IDs in
        # the older NASA dataset, so existing links keep working.
        rid = re.search(r"code=(\d+)", pick(row, "Link") or "")
        if not rid:
            skipped["no location"] += 1
            continue

        recclass = pick(row, "Type") or "Unknown"
        fall = pick(row, "Fall") or "Found"

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
            "properties": {
                "id": int(rid.group(1)),
                "name": name,
                "class": recclass,
                "kind": kind_of(recclass),
                "mass": mass,
                "fell": 1 if fall.startswith("Fell") else 0,
                "year": year,
                "relict": 1 if status.startswith("Relict") else 0,
            },
        })

    features.sort(key=lambda f: f["properties"]["id"])
    return {"type": "FeatureCollection", "features": features}, skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--csv", help="use a local CSV instead of downloading")
    ap.add_argument("--out", default=str(OUT), help=f"output file (default {OUT})")
    args = ap.parse_args()

    geo, skipped = build(load_csv(args.csv))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(geo, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

    fell = sum(f["properties"]["fell"] for f in geo["features"])
    print(f"Wrote {len(geo['features']):,} meteorites ({fell:,} seen falling) to {out}", file=sys.stderr)
    for reason, n in skipped.items():
        print(f"  skipped {n:,}: {reason}", file=sys.stderr)


if __name__ == "__main__":
    main()
