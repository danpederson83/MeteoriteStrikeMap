"""Impact craters for the map. Used by build_data.py.

The list of craters and their locations come from the Earth Impact
Database (EIDB), which is included in the Meteoritical Bulletin data as records
with status "Crater". The EIDB has no diameters there, so those come from
Wikipedia's "List of impact structures on Earth", plus a few hand-copied values
(NOT_IN_WIKI_LIST) for craters missing from that list.
"""

import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_LIST = "List of impact structures on Earth"
USER_AGENT = "MeteoriteStrikeMap/1.0 (https://github.com/danpederson83/MeteoriteStrikeMap)"

# Friendlier names for craters better known by another name.
DISPLAY_NAMES = {
    "Barringer": "Meteor Crater (Barringer)",
    "New Quebec": "Pingualuit (New Quebec)",
    "Ries": "Nördlinger Ries",
    "Kaalijärv": "Kaali",
    "Sikhote Alin": "Sikhote-Alin",
}

# Names that differ between the EIDB and Wikipedia's list.
WIKI_ALIASES = {
    "Jebel Waqf as Suwwan": "Jabel Waqf as Suwwan",
    "Kaalijärv": "Kaali",
    "New Quebec": "New Quebec/Pingualuit",
    "Ries": "Nördlinger Ries",
    "Siljan": "Siljan Ring",
    "Suvasvesi N": "Suvasvesi North",
}

# Craters missing from Wikipedia's list: (diameter in km, Wikipedia article),
# copied from each crater's own article. For a field of several craters the
# diameter is the biggest one.
NOT_IN_WIKI_LIST = {
    "Carancas": (0.0135, "2007 Carancas impact event"),
    "Crawford": (8.5, "Crawford crater"),
    "Decaturville": (6, "Decaturville crater"),
    "Gusev": (3, "Gusev crater (Russia)"),
    "Haviland": (0.015, "Haviland Crater"),
    "Ilumetsä": (0.08, "Ilumetsa crater"),
    "Kamil": (0.045, "Kamil Crater"),
    "Odessa": (0.168, "Odessa Meteor Crater"),
    "Piccaninny": (7, "Piccaninny crater"),
    "Rio Cuarto": (4.5, "Río Cuarto craters"),
    "Sikhote Alin": (0.026, "Sikhote-Alin meteorite"),
    "Sobolev": (0.053, "Sobolev crater"),
    "Suvasvesi S": (None, "Suvasvesi"),
    "Veevers": (0.08, "Veevers crater"),
}

# Ages the EIDB copy gets wrong or leaves out (checked against Wikipedia).
def _norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\[.*?\]|\(.*?\)", "", s)
    s = re.sub(r"\b(crater|impact|structure|dome|lake|basin|meteor)\b", "", s)
    return re.sub(r"[^a-z]", "", s)


def _plain(s):
    """Strip wiki markup from a table cell."""
    s = re.sub(r"\{\{sort\|[^|}]*\|([^}]*)\}\}", r"\1", s)
    s = re.sub(r"\{\{0\|[^}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    return s.replace("&nbsp;", " ").replace("'''", "").strip()


def fetch_wiki_rows():
    """Return {normalized name: {"article", "diam"}} from Wikipedia's list."""
    url = WIKI_API + "?" + urllib.parse.urlencode(dict(
        action="parse", page=WIKI_LIST, prop="wikitext", format="json", formatversion=2))
    print(f"Downloading Wikipedia: {WIKI_LIST} ...", file=sys.stderr)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        text = json.load(resp)["parse"]["wikitext"]
    text = re.sub(r"<ref[^>]*/>", "", text)
    text = re.sub(r"<ref.*?</ref>", "", text, flags=re.S)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)

    rows = {}
    for table in re.findall(r"\{\|.*?\n\|\}", text, re.S):
        heads = [h.strip() for h in re.findall(r"^!(.*)$", table, re.M)]
        if not heads or heads[0] != "Name":
            continue
        dcol = next(i for i, h in enumerate(heads) if h.startswith("Diameter"))
        for row in table.split("\n|-")[1:]:
            cells = [c[1:].strip() for c in row.split("\n") if c.startswith("|") and not c.startswith("|}")]
            if len(cells) < len(heads):
                continue
            m = re.match(r"\[\[([^|\]]+)(?:\|([^\]]+))?\]\]", cells[0])
            article = m.group(1) if m else None
            name = (m.group(2) or m.group(1)) if m else _plain(cells[0])
            nums = re.findall(r"\d+(?:\.\d+)?", _plain(cells[dcol]))
            # For a range like "1.5–1.8", use the middle.
            diam = sum(map(float, nums[:2])) / len(nums[:2]) if nums else None
            entry = {"article": article, "diam": diam}
            for key in (name, article or ""):
                rows.setdefault(_norm(key), entry)
    return rows


def parse_fell(text):
    """For craters people saw being made, the EIDB "age" says "fell 1947" (or
    "poss. fell 1863"). Return {"y": 1947} / {"y": 1863, "maybe": True}, else None.
    Other dates are left out on purpose: the site shows only recorded history."""
    m = re.search(r"fell (\d{4})", text or "", re.I)
    if not m:
        return None
    fell = {"y": int(m.group(1))}
    if "poss" in text.lower():
        fell["maybe"] = True
    return fell


def build_craters(rows, wiki):
    """rows: MetBull CSV rows (dicts). wiki: output of fetch_wiki_rows()."""
    features, no_diam = [], []
    for row in rows:
        if (row.get("Status") or "").strip() != "Crater":
            continue
        eidb_name = re.sub(r"\s*\[crater\]\s*$", "", row["Name"].strip())
        code = re.search(r"code=(\d+)", row.get("Link") or "")
        lat, lon = row.get("Latitude"), row.get("Longitude")
        if not code or not lat or not lon:
            continue

        alias = WIKI_ALIASES.get(eidb_name, eidb_name)
        w = wiki.get(_norm(alias)) if alias else None
        if eidb_name in NOT_IN_WIKI_LIST:
            diam, article = NOT_IN_WIKI_LIST[eidb_name]
        else:
            diam, article = (w["diam"], w["article"]) if w else (None, None)
        if not diam:
            no_diam.append(eidb_name)

        fell = parse_fell(row.get("Year"))
        place = (row.get("Place") or "").strip()
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(float(lon), 5), round(float(lat), 5)]},
            "properties": {
                "id": int(code.group(1)),
                "name": DISPLAY_NAMES.get(eidb_name, eidb_name),
                "place": place,
                "diam": round(diam, 4) if diam else None,
                "fell": fell,
                "wiki": article,
            },
        })
    features.sort(key=lambda f: f["properties"]["name"])
    if no_diam:
        print(f"  no diameter for: {', '.join(no_diam)}", file=sys.stderr)
    return {"type": "FeatureCollection", "features": features}
