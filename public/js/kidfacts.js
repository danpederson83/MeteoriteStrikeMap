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
     Only about 1,100 meteorites in this map were seen falling!</p>
  <p><b>🔍 Found</b> means someone found it on the ground later. It might have landed
     hundreds or thousands of years before.</p>
  <h2>Why are so many in Antarctica and deserts?</h2>
  <p>Dark rocks are easy to spot on white ice or tan sand. In Antarctica, moving ice
     even carries meteorites to the same places. Scientists go there on expeditions
     just to collect them. Try zooming in on Antarctica!</p>
  <h2>Fun facts</h2>
  <ul class="learn-list">
    <li>Scientists estimate about <b>17,000</b> meteorites land on Earth every year. Most fall in the ocean or where no one lives.</li>
    <li>Meteorites are usually <b>not burning hot</b> when they land. The outside melts in the sky, but there is not enough time for the heat to reach the middle, which is still cold from space.</li>
    <li>Most meteorites have a thin black crust called a <b>fusion crust</b>, made when the outside melted on the way down.</li>
    <li>Meteorites are some of the <b>oldest rocks</b> you can touch, about 4.5 billion years old!</li>
  </ul>
`;
