#!/usr/bin/env python3
"""Download the Meteorite Landings dataset and turn it into a clean GeoJSON file
for the map.

Data: NASA Open Data Portal "Meteorite Landings" (compiled from the
Meteoritical Society's Meteoritical Bulletin Database).

Usage:
    python3 scripts/build_data.py                 # download and build
    python3 scripts/build_data.py --csv file.csv  # build from a local CSV

Only the Python standard library is needed.
"""

import argparse
import csv
import io
import json
import sys
import urllib.request
from pathlib import Path

# Tried in order. The NASA URL is the original source; the TidyTuesday copy is
# an exact mirror of it on GitHub, used if NASA's portal is unreachable.
SOURCES = [
    "https://data.nasa.gov/api/views/gh4g-9sfh/rows.csv?accessType=DOWNLOAD",
    "https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2019/2019-06-11/meteorites.csv",
]

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "meteorites.geojson"

# Records that are not on Earth (Meridiani Planum was found on Mars by the
# Opportunity rover) are left out of an Earth map.
NOT_ON_EARTH = {"Meridiani Planum"}

LAST_VALID_YEAR = 2026  # the dataset contains at least one typo (year 2101)


def pick(row, *names):
    """Return the first non-empty value among several possible column names
    (NASA's CSV and the mirror use slightly different headers)."""
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


def fetch(url):
    print(f"Downloading {url} ...", file=sys.stderr)
    req = urllib.request.Request(url, headers={"User-Agent": "MeteoriteStrikeMap/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8-sig")


def load_csv(local_path=None):
    if local_path:
        return Path(local_path).read_text(encoding="utf-8-sig")
    last_err = None
    for url in SOURCES:
        try:
            return fetch(url)
        except Exception as e:  # try the next mirror
            print(f"  failed: {e}", file=sys.stderr)
            last_err = e
    raise SystemExit(f"Could not download the dataset: {last_err}")


def build(text):
    features = []
    skipped = {"no location": 0, "not on Earth": 0}
    for row in csv.DictReader(io.StringIO(text)):
        name = pick(row, "name")
        lat = pick(row, "reclat", "lat")
        lon = pick(row, "reclong", "long")
        if not name or lat is None or lon is None:
            skipped["no location"] += 1
            continue
        lat, lon = float(lat), float(lon)
        # 0,0 is a placeholder for "unknown location" in this dataset.
        if lat == 0 and lon == 0:
            skipped["no location"] += 1
            continue
        if name in NOT_ON_EARTH or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            skipped["not on Earth"] += 1
            continue

        mass = pick(row, "mass (g)", "mass")
        mass = float(mass) if mass is not None else None
        if mass is not None and mass.is_integer():
            mass = int(mass)

        year = pick(row, "year")
        if year is not None:
            # NASA's CSV has full timestamps ("01/01/1880 12:00:00 AM").
            year = int(year[6:10]) if "/" in year else int(float(year))
            if year > LAST_VALID_YEAR:
                year = None

        recclass = pick(row, "recclass", "class") or "Unknown"
        fall = pick(row, "fall") or "Found"

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
            "properties": {
                "id": int(pick(row, "id")),
                "name": name,
                "class": recclass,
                "kind": kind_of(recclass),
                "mass": mass,
                "fell": 1 if fall == "Fell" else 0,
                "year": year,
                "relict": 1 if pick(row, "nametype", "name_type") == "Relict" else 0,
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
