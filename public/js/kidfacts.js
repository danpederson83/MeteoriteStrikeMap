// Kid-friendly explanations used by the map and sidebar.
// Everything here is plain data + small helper functions, so it is easy to edit.

export const KINDS = {
  stony: {
    label: "Stony",
    emoji: "🪨",
    color: "#e0803a",
    blurb: "Made mostly of rock. This is the most common kind of meteorite.",
  },
  iron: {
    label: "Iron",
    emoji: "⚙️",
    color: "#7a8a9e",
    blurb: "Made mostly of the metals iron and nickel. It came from the center (core) of an asteroid that broke apart. Iron meteorites are very heavy for their size.",
  },
  "stony-iron": {
    label: "Stony-iron",
    emoji: "💎",
    color: "#2fa37a",
    blurb: "Half rock, half metal. Some have beautiful yellow-green crystals inside!",
  },
  mars: {
    label: "From Mars",
    emoji: "🔴",
    color: "#d6336c",
    blurb: "A piece of the planet Mars! A huge impact on Mars blasted this rock into space, and it eventually landed on Earth.",
  },
  moon: {
    label: "From the Moon",
    emoji: "🌙",
    color: "#9b6ddb",
    blurb: "A piece of the Moon! It was knocked off the Moon by an impact and fell to Earth.",
  },
};

// Explanations for the scientific class codes (e.g. "L6", "Iron, IIIAB").
// Checked in order; the first match wins.
const CLASS_NOTES = [
  [/^martian/i, "A Martian meteorite. Scientists know it is from Mars because tiny bubbles of gas trapped inside match the air on Mars that NASA spacecraft measured."],
  [/^lunar/i, "A lunar meteorite: rock from the Moon's surface."],
  [/^iron/i, "An iron meteorite. If you cut one, polish it and add a little acid, a criss-cross pattern of metal crystals appears. It is called the Widmanstätten pattern, and it only forms when metal cools very slowly, over millions of years."],
  [/^pallasite/i, "A pallasite: shiny metal filled with see-through yellow-green crystals called olivine. They may have formed deep inside an asteroid, where its metal core met its rocky outside."],
  [/^mesosiderite/i, "A mesosiderite: rock and metal smashed together into a jumble."],
  [/^(eucrite|howardite|diogenite)/i, "This rock probably came from Vesta, one of the biggest asteroids! A giant crash on Vesta knocked pieces into space."],
  [/^ureilite/i, "A ureilite: a rare kind of meteorite that contains tiny diamonds!"],
  [/^aubrite/i, "An aubrite: a rare, very pale rock that formed with almost no oxygen around."],
  [/^C[A-Z]?([\d~\-/ (]|$)/, "A carbonaceous chondrite. It has carbon in it, and sometimes water locked inside its minerals. These are some of the oldest, least-changed rocks in the solar system: about 4.5 billion years old!"],
  [/^E[HL]?([\d~\-/ (]|$)/, "An enstatite chondrite. These formed with very little oxygen. Some scientists think Earth was built from material a lot like this."],
  [/^(h|l|ll|oc)\b|^(h|l|ll)[\d~\-/(]/i, "An ordinary chondrite. These are the most common meteorites. They are full of tiny round grains called chondrules, which were drops of melted rock floating in space before the planets formed."],
  [/^relict/i, "A relict meteorite: it has weathered so much over time that only a little of the original meteorite is left."],
  [/achondrite|acapulcoite|lodranite|winonaite|brachinite|angrite/i, "An achondrite: rock that was melted and changed inside its asteroid, a bit like lava rock on Earth."],
];

export function classNote(recclass) {
  for (const [re, note] of CLASS_NOTES) if (re.test(recclass)) return note;
  return null;
}

// Ordinary chondrites (H5, L6, LL3…) include a number for how much they were heated.
export function heatNote(recclass) {
  const m = /^(H|L|LL|E|EH|EL|C[IMVORKH]?)\s*~?([1-7])/i.exec(recclass);
  if (!m) return null;
  return `The number ${m[2]} tells how much this rock was heated inside its asteroid (1–2 = changed by water, 3 = barely changed, 6–7 = heated a lot).`;
}

// ---- Weight comparisons -------------------------------------------------------
// [grams, singular, plural]
const THINGS = [
  [1, "paper clip", "paper clips"],
  [5, "nickel coin", "nickel coins"],
  [50, "chicken egg", "chicken eggs"],
  [150, "apple", "apples"],
  [430, "soccer ball", "soccer balls"],
  [1000, "pineapple", "pineapples"],
  [6000, "bowling ball", "bowling balls"],
  [22000, "1st grader", "1st graders"],
  [40000, "5th grader", "5th graders"],
  [100000, "giant panda", "giant pandas"],
  [450000, "grand piano", "grand pianos"],
  [1500000, "car", "cars"],
  [6000000, "African elephant", "African elephants"],
  [13000000, "school bus", "school buses"],
];

export function massCompare(grams) {
  if (grams == null) return null;
  if (grams < 1) return "lighter than a paper clip";
  let best = THINGS[0];
  for (const t of THINGS) if (t[0] <= grams) best = t;
  const n = Math.round(grams / best[0]);
  if (n <= 1) return `about as heavy as a ${best[1]}`;
  return `about as heavy as ${n.toLocaleString()} ${best[2]}`;
}

export function formatMass(grams) {
  if (grams == null) return "Unknown";
  if (grams >= 1_000_000) {
    const t = grams / 1_000_000;
    return `${t.toLocaleString(undefined, { maximumFractionDigits: 1 })} metric tons`;
  }
  if (grams >= 1000) {
    const kg = grams / 1000;
    const lb = grams / 453.592;
    return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg (${lb.toLocaleString(undefined, { maximumFractionDigits: 0 })} lb)`;
  }
  return `${grams.toLocaleString(undefined, { maximumFractionDigits: 1 })} grams`;
}

// ---- Famous meteorites ---------------------------------------------------------
// Stories keyed by the exact dataset name. These also fill the "Famous" list.
export const FAMOUS = {
  "Hoba": "The biggest meteorite ever found! It weighs about 60 tons and is so heavy it has never been moved. It is still in the spot where it landed in Namibia, Africa. A farmer found it in 1920 when his plow hit it.",
  "Cape York": "For hundreds of years, Inuit people in Greenland chipped iron off these huge meteorites to make knives and tools. In 1897 the biggest piece (31 tons, called Ahnighito) was shipped to New York, where it is now in a museum.",
  "Willamette": "The biggest meteorite ever found in the United States, about 15.5 tons. It is sacred to the Clackamas people of Oregon. Today it is on display at the American Museum of Natural History in New York City.",
  "Campo del Cielo": "Its name means \"Field of the Sky\" in Spanish. Thousands of years ago, many iron pieces fell over a big area of Argentina and made craters. Local people knew about the craters long before scientists did.",
  "Canyon Diablo": "This is the meteorite that made Meteor Crater in Arizona about 50,000 years ago! The crater is more than half a mile (about 1 km) wide. Most of the original space rock vaporized when it hit, and pieces were scattered all around.",
  "Sikhote-Alin": "In 1947, people in eastern Russia watched a giant fireball streak across the sky in the daytime. The iron meteorite broke into thousands of pieces and made dozens of craters in the forest.",
  "Chelyabinsk": "On February 15, 2013, a space rock about 20 meters (65 feet) wide exploded high above Chelyabinsk, Russia. The blast broke windows all over the city, and about 1,500 people were hurt, mostly by broken glass. It was caught on lots of car dashboard cameras! A large piece was later pulled out of a frozen lake.",
  "Saint-Pierre-le-Viger": "On February 13, 2023, a space rock about 1 meter (3 feet) wide streaked over Normandy, France. Astronomers knew it was coming! An astronomer in Hungary spotted it in space about 7 hours earlier, and scientists figured out where it would land. Volunteers searched the farm fields, and the first piece was found just two days later.",
  "Ribbeck": "Just after midnight on January 21, 2024, a small asteroid lit up the sky near Berlin, Germany. Only about 3 hours earlier, the same Hungarian astronomer who spotted the 2023 France meteorite saw it coming! Hunters found many pieces near the village of Ribbeck. It turned out to be an aubrite, a very rare, pale meteorite.",
  "Sylacauga":"On November 30, 1954, this meteorite crashed through the roof of a house in Alabama, bounced off a radio, and hit Ann Hodges on the hip while she was napping on her couch. She got a big bruise. She is the first person known for sure to have been hit by a meteorite!",
  "Peekskill": "On October 9, 1992, a bright green fireball flew over the eastern United States. People at Friday night football games filmed it! A piece landed in Peekskill, New York, and smashed the trunk of a parked red car.",
  "Ensisheim": "The oldest meteorite fall where people saw it land and the rock still exists. A boy saw it land in a wheat field in France in 1492, the same year Columbus sailed to America. It landed on November 7, 1492.",
  "Allende": "It fell in Mexico in 1969 and broke into thousands of pieces. It contains white specks that are among the very first solid things to form in our solar system, over 4.5 billion years ago, before Earth existed.",
  "Murchison": "It fell in Australia in 1969. Scientists found amino acids inside it. Amino acids are building blocks of life. It also contains tiny grains of stardust that are older than our Sun!",
  "Allan Hills 84001": "A rock from Mars found in Antarctica in 1984. In 1996, some scientists said it might have signs of tiny ancient life from Mars. That made huge news! Today most scientists think the clues were made in other ways, but it got people excited to explore Mars.",
  "Nakhla": "A meteorite from Mars that fell in Egypt in 1911. There is a famous story that a piece of it hit and killed a dog. Nobody knows for sure if that really happened!",
  "Tissint": "A rock from Mars that fell in the desert of Morocco in 2011. People saw the fireball, so scientists got fresh pieces of Mars to study.",
  "Gibeon": "A huge rain of iron meteorites fell in Namibia, Africa, long ago. The Nama people used the iron to make tools. Some pieces are now displayed in the capital city, Windhoek.",
};

// ---- "Learn about meteorites" panel -------------------------------------------
export const LEARN_HTML = `
  <h2>Meteoroid, meteor, or meteorite?</h2>
  <ul class="learn-list">
    <li><b>Meteoroid</b>: a space rock floating in space. 🌌</li>
    <li><b>Meteor</b>: the streak of light when it zooms into our air and gets super hot. Also called a "shooting star". 🌠</li>
    <li><b>Meteorite</b>: the piece that survives and lands on the ground. 🪨</li>
  </ul>
  <h2>Where do they come from?</h2>
  <p>Most meteorites are pieces of <b>asteroids</b> from the asteroid belt between Mars and Jupiter.
     A few came from the <b>Moon</b> or from <b>Mars</b>!</p>
  <h2>"Seen falling" vs. "found"</h2>
  <p><b>👀 Seen falling</b> means people saw it come down, so we know exactly when it landed.
     Only about 1,200 meteorites in this map were seen falling!</p>
  <p><b>🔍 Found</b> means someone found it on the ground later. It might have landed
     hundreds or thousands of years before.</p>
  <h2>Why are so many in Antarctica and deserts?</h2>
  <p>Dark rocks are easy to spot on white ice or tan sand. In Antarctica, moving ice
     even carries meteorites to the same places. Scientists go there on expeditions
     just to collect them. Try zooming in on Antarctica!</p>
  <h2>💥 Impact craters</h2>
  <p>When a really big space rock hits the ground, it doesn't just land. It hits so fast
     that it blasts out a giant hole called an <b>impact crater</b>, usually many times
     wider than the rock itself. The rock itself often vaporizes in the blast!</p>
  <p>The <b>brown rings</b> on the map are the 190 craters scientists have confirmed on Earth.
     Most are millions of years old. Wind, rain, ice and plants wear craters away or bury them,
     so many are hard to see today. Scientists find them by looking for clues like
     <b>shatter cones</b>, rocks with cone-shaped cracks that only form in a huge impact.</p>
  <p>The Moon is covered in craters because it has no wind, rain or plants to erase them.</p>
  <h2>Fun facts</h2>
  <ul class="learn-list">
    <li>Scientists estimate about <b>17,000</b> meteorites land on Earth every year. Most fall in the ocean or where no one lives.</li>
    <li>Meteorites are usually <b>not burning hot</b> when they land. The outside melts in the sky, but there is not enough time for the heat to reach the middle, which is still cold from space.</li>
    <li>Most meteorites have a thin black crust called a <b>fusion crust</b>, made when the outside melted on the way down.</li>
    <li>Meteorites are some of the <b>oldest rocks</b> you can touch, about 4.5 billion years old!</li>
  </ul>
`;

// ---- Impact craters ----------------------------------------------------------
export const CRATER_COLOR = "#7c2d12";

export function formatDiameter(km) {
  if (km == null) return "Unknown";
  if (km < 1) {
    const m = km * 1000;
    return `${Math.round(m).toLocaleString()} meters (${Math.round(m * 3.28084).toLocaleString()} feet)`;
  }
  const mi = km * 0.621371;
  const f = (x) => x.toLocaleString(undefined, { maximumFractionDigits: x < 10 ? 1 : 0 });
  return `${f(km)} km (${f(mi)} miles)`;
}

function plural(n, one, many) { return `${n.toLocaleString()} ${n === 1 ? one : many}`; }

function duration(hours) {
  if (hours < 1) return plural(Math.max(1, Math.round(hours * 60)), "minute", "minutes");
  return plural(Math.round(hours), "hour", "hours");
}

export function craterSizeCompare(km) {
  if (km == null) return null;
  const m = km * 1000;
  if (m < 60) {
    const n = Math.round(m / 12);
    return n <= 1 ? "about as wide as a school bus is long" : `about as wide as ${n} school buses parked end to end`;
  }
  if (m < 2000) {
    const n = Math.round(m / 110);
    return n <= 1 ? "about as wide as a football field is long" : `about as wide as ${n} football fields lined up end to end`;
  }
  if (km < 20) return `It would take about ${duration(km / 4)} to walk across`;
  return `A car on the highway would take about ${duration(km / 100)} to drive across`;
}

function years(y) {
  const n = (x, d) => x.toLocaleString(undefined, { maximumFractionDigits: d });
  if (y >= 1e9) return `${n(y / 1e9, 2)} billion years`;
  if (y >= 1e6) return `${n(y / 1e6, y < 1e7 ? 1 : 0)} million years`;
  return `${n(Math.round(y / 100) * 100 || y, 0)} years`;
}

// age = {q: "about"|"lt"|"gt"|"range"|"fell", y, y2?, maybe?} (see scripts/craters.py)
export function formatAge(age, thisYear) {
  if (!age) return { main: "Unknown" };
  switch (age.q) {
    case "fell": return {
      main: `${age.maybe ? "Maybe in " : "In "}${age.y}`,
      sub: `People saw the meteorite fall, about ${plural(thisYear - age.y, "year", "years")} ago.`,
    };
    case "lt": return { main: `Less than ${years(age.y)} ago` };
    case "gt": return { main: `More than ${years(age.y)} ago` };
    case "range": return { main: `Between ${years(age.y).replace(/ years$/, "")} and ${years(age.y2)} ago` };
    default: return { main: `About ${years(age.y)} ago` };
  }
}

const ERAS = [
  [3e5, "🧍 Humans were already living on Earth then."],
  [2.6e6, "🦣 This was during the Ice Age era, the time of mammoths and saber-toothed cats."],
  [66e6, "🐘 The dinosaurs were already gone. Mammals ruled the land."],
  [230e6, "🦖 Dinosaurs were alive then!"],
  [540e6, "🐟 This was before the dinosaurs. Most life was fish and other sea creatures, with the first plants and animals moving onto land."],
  [Infinity, "🦠 This was before there were animals with shells or bones. Most life was tiny creatures in the sea."],
];

// What was living on Earth then, if we can tell from the age.
export function eraNote(age) {
  if (!age || age.q === "fell") return null;
  const lo = age.q === "lt" ? 0 : age.y;
  const hi = age.q === "gt" ? Infinity : age.q === "range" ? age.y2 : age.y;
  const band = (y) => ERAS.findIndex(([top]) => y < top || top === Infinity);
  return band(lo) === band(hi) ? ERAS[band(lo)][1] : null;
}

// Stories keyed by the crater name shown on the map. These also fill the
// "Famous craters" list.
export const CRATER_STORIES = {
  "Chicxulub": "This is the crater from the asteroid that wiped out the dinosaurs! About 66 million years ago, a space rock about 10 km (6 miles) wide slammed into what is now Mexico. Dust and smoke blocked the Sun around the world. The crater is buried under the ground and the sea today, but scientists found it by measuring the rocks underneath.",
  "Meteor Crater (Barringer)": "One of the best-kept craters on Earth, in the Arizona desert. An iron meteorite about 50 meters (160 feet) wide made it about 50,000 years ago. A man named Daniel Barringer spent years drilling, hoping to find a giant iron meteorite underneath, but most of it had vaporized in the blast. Apollo astronauts trained here before going to the Moon!",
  "Vredefort": "The biggest impact crater ever found on Earth, in South Africa. It is about 2 billion years old, so old that most of it has worn away, and it was even bigger when it formed. It is a UNESCO World Heritage Site.",
  "Sudbury": "A giant, very old crater in Canada, almost 2 billion years old. The impact brought up metals like nickel and copper, and people have mined them here for more than 100 years. Apollo astronauts came here to study impact rocks.",
  "Nördlinger Ries": "About 15 million years ago, an asteroid hit what is now Germany. Today a whole town, Nördlingen, sits inside the crater. Its church was built from rock made by the impact, and that rock has millions of tiny diamonds in it, too small to see!",
  "Manicouagan": "A ring-shaped lake in Quebec, Canada, about 100 km (60 miles) wide. The crater is about 214 million years old. It's so big and round that astronauts can easily see it from space. Some people call it the \"Eye of Quebec\".",
  "Chesapeake Bay": "About 35 million years ago, a space rock hit the ocean near what is now Virginia. The crater is buried deep under the mud, and it helped decide where Chesapeake Bay formed. Scientists only found it in the 1990s.",
  "Carancas": "On September 15, 2007, people in a village in Peru saw a fireball and heard a huge boom. A stony meteorite blasted a crater about 13 meters (45 feet) wide, and it filled with bubbling water. It's one of the only times people have watched a crater being made.",
  "Wabar": "Craters in the sandy desert of Saudi Arabia. In 1932, an explorer searching for a legendary lost city found them instead, surrounded by black glass and chunks of iron. Moving sand dunes keep burying them.",
  "Lonar": "A crater lake in India made about 50,000 years ago. Its water is salty, and in 2020 the whole lake turned pink almost overnight because of tiny living things in the water!",
  "Kaali": "Thousands of years ago, a meteorite broke apart over an island in Estonia and made nine craters. The biggest one is now a round pond. People already lived there, so some may have seen it happen. It might even be remembered in old legends.",
  "Pingualuit (New Quebec)": "A perfectly round lake in northern Canada, about 1.4 million years old. Its water is some of the clearest in the world. Because it is so deep and has no river flowing in, scientists study its mud to learn about the Ice Ages.",
  "Gosses Bluff": "A ring of hills in the middle of Australia, made by an impact about 142 million years ago. To the Western Arrernte people it is Tnorala, a sacred place. In their story, a baby fell from the sky here in a wooden dish.",
  "Sikhote-Alin": "When the Sikhote-Alin meteorite fell in Russia in 1947, its iron pieces made more than 100 craters in the forest. The biggest is about 26 meters (85 feet) wide. Look for the Sikhote-Alin meteorite on the map too!",
};
