# 🌠 Meteorite Map

An interactive world map of meteorites that have landed on Earth, made for kids
doing school projects. Pan and zoom like Google Maps, spin the 3D globe, and tap a
meteorite to see what it's made of, how heavy it is, when it fell, and its story
if it's a famous one. Impact craters are on the map too.

## Features

- **50,951 meteorites** with known locations, colored by kind: stony, iron,
  stony-iron, from Mars, and from the Moon.
- **"Seen falling" filter.** Show only the ~1,200 meteorites people actually saw
  come down, or show all of them.
- **Kid-friendly sidebar.** Weight compared to everyday things ("about as heavy as
  6 pineapples"), "how many years ago", and plain-language explanations of
  meteorite types.
- **💥 190 impact craters** (brown rings) from the Earth Impact Database. Tap one
  to see how wide it is ("it would take about 51 minutes to walk across"), how old
  it is and what was living then ("Dinosaurs were alive then!"). A dashed circle
  shows the crater's real size on the map. Turn craters on or off under "Also show".
- **⭐ Famous meteorites and craters** with short stories: Hoba, Chelyabinsk, the Alabama
  meteorite that hit a woman on her couch, the one that hit a car in New York, and
  more. Famous craters include Chicxulub (the dinosaur one), Meteor Crater,
  Vredefort and the town built inside the Ries crater.
- **📚 Learn** panel: meteoroid vs. meteor vs. meteorite, where they come from, and
  why so many are found in Antarctica.
- Filters for size and year, plus search by name.
- **Shareable links.** The address bar remembers the map view and the selected
  meteorite, so you can bookmark a view for a presentation.
- Works on phones and tablets.

## Run it on your home server

With Docker:

```bash
docker compose up -d --build
```

Then open `http://<your-server>:8092`. To use a different port, change `8092` in
`docker-compose.yml`.

Without Docker, it's a plain static site. Point any web server at the `public/`
folder, or for a quick test:

```bash
python3 -m http.server 8080 --directory public
```

## Where the data comes from

The Meteoritical Society's
[Meteoritical Bulletin Database](https://www.lpi.usra.edu/meteor/) (MetBull),
via a [full copy on Kaggle](https://www.kaggle.com/datasets/sweeteyesbirb/meteoritical-bulletin-dataset)
made in October 2024. MetBull itself blocks scripts, and NASA's older copy stops
in 2013. The cleaned file is already in `public/data/meteorites.geojson`. To
rebuild it:

```bash
python3 scripts/build_data.py
```

The script downloads the Kaggle copy (no login needed). It drops records with no
usable location (about 32,000, mostly small Antarctic and desert finds), rocks
that turned out not to be meteorites, doubtful or discredited claims, and craters
with no meteorite found. It also drops "Meridiani Planum", which was found on Mars
by a rover. If a newer copy of MetBull gets posted, change `SOURCE` in the script
(or pass `--csv`) and rerun it.

### Impact craters

`build_data.py` also writes `public/data/craters.geojson`. The craters, their
locations and ages come from the Earth Impact Database (EIDB), which is included
in the Meteoritical Bulletin data. Diameters come from Wikipedia's
[List of impact structures on Earth](https://en.wikipedia.org/wiki/List_of_impact_structures_on_Earth),
which the script downloads, plus a few hand-copied values for craters missing from
that list (see `scripts/craters.py`). The EIDB rounds many locations, so a crater's
dashed size circle can sit a little off from the real crater on the map.

Things worth knowing for a presentation:

- The data covers meteorites through 2024. Even newer finds are in the
  Meteoritical Bulletin Database, which each sidebar links to ("Science record").
- "Found" meteorites can have landed long before the year they were found.
- Ribbeck (Germany, 2024) and Saint-Pierre-le-Viger (France, 2023) were spotted
  in space as small asteroids hours before they hit, and pieces were found after.

## Map tiles

The basemap comes from [OpenFreeMap](https://openfreemap.org), which is free and
needs no account or API key. To change it, edit `styleUrl` in `public/js/config.js`.
If the basemap can't load, the meteorites still show on a plain blue background.

To make the server fully independent of outside services later, you can self-host
a world basemap with [Protomaps PMTiles](https://docs.protomaps.com/) and point
`styleUrl` at it.

## Project layout

```
public/                 the website (this is all that gets served)
  index.html
  css/app.css
  js/app.js             map, filters, sidebar
  js/kidfacts.js        kid-friendly text: kinds, weight comparisons, famous stories
  js/config.js          basemap URL, starting view, globe on/off
  data/meteorites.geojson
  vendor/maplibre-gl/   MapLibre GL JS 5.24.0 (BSD-3-Clause), bundled so no CDN is needed
scripts/build_data.py   downloads and cleans the dataset
Dockerfile, nginx.conf, docker-compose.yml
```

To add or edit a famous meteorite's story, add it to `FAMOUS` in
`public/js/kidfacts.js`, using the name exactly as it appears in the data.
