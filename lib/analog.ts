import type { Match } from "./types";
import { marsLocations } from "./mars-locations";

export const factorLabels = {
  terrain: "Terrain shape",
  geology: "Geology, mineralogy & materials",
  temperature: "Temperature & environmental extremes",
  water: "Water, ice & resources",
  dust: "Dust, wind & erosion",
  biology: "Habitability & biosignature research",
  subsurface: "Caves & subsurface environments",
  operations: "Mobility, navigation & construction",
  illumination: "Illumination & exposure",
  environment: "Gravity, atmosphere & radiation",
} as const;
export type Factor = keyof typeof factorLabels;
export type AnalogWeights = Record<Factor, number>;
export const defaultAnalogWeights: AnalogWeights = {
  terrain: 60,
  geology: 20,
  temperature: 0,
  water: 10,
  dust: 5,
  biology: 5,
  subsurface: 0,
  operations: 0,
  illumination: 0,
  environment: 0,
};
export type Evidence = { text: string; traits: string[]; source: string };
export type SiteEvidence = {
  name: string;
  factors: Partial<Record<Factor, Evidence>>;
  use: string;
  limits: string;
};
const evidence = (
  text: string,
  traits: string[],
  source: string,
): Evidence => ({ text, traits, source });
const gallery = "https://science.nasa.gov/solar-system/analog-explorer/";
const iceSource =
  "https://www.nasa.gov/centers-and-facilities/jpl/where-should-future-astronauts-land-on-mars-follow-the-water/";
const claySource =
  "https://www.esa.int/ESA_Multimedia/Images/2022/08/Global_map_of_hydrated_minerals_on_Mars";
const volcanic = (name: string, source: string): SiteEvidence => ({
  name,
  factors: {
    geology: evidence(
      "Volcanic landforms and lava emplacement provide a regional process comparison; identical mineral chemistry is not established.",
      ["volcanic"],
      source,
    ),
  },
  use: "Compare lava landforms and test geological mapping strategies on Earth.",
  limits:
    "Volcano scale, eruption history and gravity differ. Regional context does not establish properties at every sampled pixel.",
});
const clay = (name: string): SiteEvidence => ({
  name,
  factors: {
    geology: evidence(
      "Orbital spectroscopy identifies clay-bearing terrain, recording water–rock alteration.",
      ["clay", "aqueous-alteration"],
      claySource,
    ),
    water: evidence(
      "Hydrated minerals record past interaction with water; they do not establish accessible present-day water.",
      ["past-water"],
      claySource,
    ),
    biology: evidence(
      "Ancient altered rocks motivate biosignature preservation research; life has not been established here.",
      ["biosignature-preservation"],
      "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/Final_two_ExoMars_landing_sites_chosen",
    ),
  },
  use: "Test sampling and mineral-identification methods in altered terrestrial rocks.",
  limits:
    "Mineral detections are regional; a clay signal alone does not demonstrate habitability or a biological origin.",
});
const ice = (name: string, source: string): SiteEvidence => ({
  name,
  factors: {
    water: evidence(
      "Regional observations support subsurface ice investigations. Ice presence and depth need verification for the selected window.",
      ["ground-ice"],
      source,
    ),
  },
  use: "Test ground-penetrating radar, ice sampling and resource prospecting in terrestrial frozen ground.",
  limits:
    "No ice-depth raster is extracted here. Regional ice evidence does not guarantee extractable ice at the chosen coordinate.",
});
const marsEvidence: Record<string, SiteEvidence> = {
  "Jezero crater": {
    name: "Jezero crater",
    factors: {
      geology: evidence(
        "The ancient delta and carbonate-bearing deposits offer sedimentary and water–rock alteration comparisons.",
        ["sedimentary", "carbonate", "aqueous-alteration"],
        "https://www.usgs.gov/publications/mineral-diversity-jezero-crater-evidence-possible-lacustrine-carbonates-mars",
      ),
      water: evidence(
        "Delta and lake-margin deposits record ancient water, rather than evidence of a present-day usable reservoir.",
        ["past-water", "lake"],
        "https://www.usgs.gov/publications/mineral-diversity-jezero-crater-evidence-possible-lacustrine-carbonates-mars",
      ),
      biology: evidence(
        "Carbonate and sediment preservation motivate searches for ancient biosignatures. A potential preservation environment is not evidence of life.",
        ["biosignature-preservation"],
        "https://www.usgs.gov/publications/mineral-diversity-jezero-crater-evidence-possible-lacustrine-carbonates-mars",
      ),
    },
    use: "Practice sample selection and distinguish sedimentary features from possible biosignatures.",
    limits:
      "Modern Earth lakes have active biology and liquid water. Jezero’s ancient environment cannot be reconstructed by visual resemblance alone.",
  },
  "Gale crater": {
    name: "Gale crater",
    factors: {
      geology: evidence(
        "Layered lake deposits and mudstone record sediment deposition and subsequent erosion.",
        ["sedimentary"],
        "https://science.nasa.gov/resource/a-guide-to-gale-crater/",
      ),
      water: evidence(
        "Mudstone observations establish a former lake environment.",
        ["past-water", "lake"],
        "https://science.nasa.gov/resource/possible-extent-of-ancient-lake-in-gale-crater-mars/",
      ),
      dust: evidence(
        "Wind erosion exposes older lake deposits; compare sediment removal and exposure histories.",
        ["aeolian"],
        "https://science.nasa.gov/resource/a-guide-to-gale-crater/",
      ),
    },
    use: "Test stratigraphic mapping and sample selection across layered deposits.",
    limits:
      "Earth weathering rates and modern hydrology differ; matched sedimentary processes need not share age or biology.",
  },
  "Elysium Planitia": volcanic(
    "Elysium Planitia",
    "https://science.nasa.gov/resource/lava-flow-front-in-elysium-planitia/",
  ),
  "Olympus Mons": volcanic(
    "Olympus Mons",
    "https://www.usgs.gov/maps/geologic-map-olympus-mons-caldera-mars",
  ),
  "Arsia Mons": volcanic(
    "Arsia Mons",
    "https://ntrs.nasa.gov/api/citations/20210000448/downloads/1459_Radotich_011321.pdf",
  ),
  "Arcadia Planitia": ice("Arcadia Planitia", iceSource),
  "Utopia Planitia": ice(
    "Utopia Planitia",
    "https://www.jpl.nasa.gov/images/pia21138-location-of-large-subsurface-water-ice-deposit-in-utopia-planitia-mars/",
  ),
  "Mawrth Vallis": clay("Mawrth Vallis"),
  "Oxia Planum": clay("Oxia Planum"),
  "Valles Marineris": {
    name: "Valles Marineris",
    factors: {
      geology: evidence(
        "A vast canyon and graben system offers structural-landform comparisons. Similar canyon shapes do not establish the same formation process.",
        ["canyon", "tectonic"],
        "https://science.nasa.gov/photojournal/valles-marineris/",
      ),
    },
    use: "Test navigation and geological mapping in dissected terrain.",
    limits:
      "Relief and formation history differ from terrestrial river canyons; slope similarity alone is not a process match.",
  },
  "Hellas basin": {
    name: "Hellas basin",
    factors: {
      geology: evidence(
        "A large impact basin with a complex subsequent structural and erosional history.",
        ["impact"],
        "https://pubs.usgs.gov/imap/i2694/i2694pamphlet.pdf",
      ),
    },
    use: "Compare impact geology and mapping of overprinted landforms.",
    limits:
      "Basin scale is far larger than the Earth impact structures screened here.",
  },
  "North polar region": ice(
    "North polar region",
    "https://marsed.mars.asu.edu/mep/ice/polar-caps",
  ),
  "South polar region": ice(
    "South polar region",
    "https://marsed.mars.asu.edu/mep/ice/polar-caps",
  ),
};
// Do not equate polar caps with buried ground ice, or candidate skylights with surveyed caves.
for (const name of ["North polar region", "South polar region"]) {
  marsEvidence[name].factors.water = evidence(
    "Polar layered ice and seasonal carbon-dioxide frost motivate ice and sublimation studies; terrestrial water ice cannot reproduce the CO₂ cycle.",
    ["polar-ice"],
    "https://marsed.mars.asu.edu/mep/ice/polar-caps",
  );
}
marsEvidence["Arsia Mons"].factors.subsurface = evidence(
  "Possible skylights in the wider Arsia region motivate cave exploration; a cave at this representative summit coordinate is not confirmed.",
  ["possible-skylight"],
  "https://ntrs.nasa.gov/api/citations/20210000448/downloads/1459_Radotich_011321.pdf",
);

const earthEvidence: Record<string, SiteEvidence> = {
  "Atacama Desert": {
    name: "Atacama Desert",
    factors: {
      temperature: evidence(
        "Hyperaridity provides an environmental stress analog, but no temperature time series is compared.",
        ["hyperarid"],
        "https://astrobiology.nasa.gov/research-locations/",
      ),
      biology: evidence(
        "Research in the Atacama investigates preservation and detection of biosignatures under very dry conditions.",
        ["biosignature-preservation"],
        "https://www.nasa.gov/analog-missions/",
      ),
    },
    use: "Test life-detection methods and contamination control in dry soils.",
    limits:
      "Regional Atacama studies do not certify the sampled center as a specific study outcrop; Earth retains oxygen, biology and atmospheric shielding.",
  },
  "Iceland · Askja": {
    name: "Iceland · Askja",
    factors: {
      geology: evidence(
        "Basaltic volcanic terrain supports comparisons of lava and volcanic sediment processes.",
        ["volcanic", "basalt"],
        "https://volcano.si.edu/volcano.cfm?vn=373060",
      ),
      dust: evidence(
        "Gravel ripples near Askja are used to investigate wind-shaped landforms.",
        ["aeolian"],
        gallery,
      ),
      water: evidence(
        "Radar studies investigate ice buried beneath Askja tephra.",
        ["ground-ice"],
        "https://doi.org/10.1029/2023JE007834",
      ),
    },
    use: "Test radar and geological field mapping, and compare wind-shaped sediment.",
    limits:
      "Earth moisture affects radar response; higher atmospheric density changes sediment transport.",
  },
  "Mauna Kea": {
    name: "Mauna Kea",
    factors: {
      geology: evidence(
        "Lava flows and cinder cones record basaltic and later postshield volcanism.",
        ["volcanic", "basalt"],
        "https://www.usgs.gov/volcanoes/mauna-kea/science/geology-and-history-mauna-kea",
      ),
    },
    use: "Study volcanic mapping and lava morphology.",
    limits:
      "Postshield chemistry and summit form differ from Martian shield volcanoes; marine portions of large analysis windows are not field analog terrain.",
  },
  "Haughton impact structure": {
    name: "Haughton impact structure",
    factors: {
      geology: evidence(
        "An impact structure in a polar desert supports impact-geology field comparisons.",
        ["impact"],
        "https://ntrs.nasa.gov/api/citations/20110008151/downloads/20110008151.pdf",
      ),
    },
    use: "Practice geological reconnaissance and field operations in impact terrain.",
    limits:
      "Different target rocks, impact scale and terrestrial weathering limit equivalence.",
  },
};

export function targetEvidence(
  body: "moon" | "mars",
  lat: number,
  lon: number,
): SiteEvidence {
  // A small registration area identifies curated landmark context, not a geological coverage polygon.
  const site =
    body === "mars"
      ? marsLocations.find((p) => {
          const dlon = Math.abs(
            ((((lon - p.lon + 180) % 360) + 360) % 360) - 180,
          );
          return (
            Math.hypot(
              (lat - p.lat) * 59.3,
              dlon * 59.3 * Math.cos((lat * Math.PI) / 180),
            ) < 25
          );
        })
      : undefined;
  return site
    ? marsEvidence[site.name]
    : {
        name: `${body === "mars" ? "Mars" : "Moon"} · ${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,
        factors: {},
        use: "Use measured regional terrain to shortlist areas, then acquire local geological and environmental evidence.",
        limits:
          "This coordinate has no curated geological coverage in the current evidence catalog. Landmark proximity does not establish local mineralogy, ice or caves.",
      };
}
export function earthSiteEvidence(candidate: Match): SiteEvidence | undefined {
  return candidate.catalog ? earthEvidence[candidate.name] : undefined;
}
export function validateAnalogWeights(value: unknown): AnalogWeights {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Choose valid analog weights.");
  const result = {} as AnalogWeights;
  for (const key of Object.keys(factorLabels) as Factor[]) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100)
      throw Error("Choose analog weights between 0 and 100.");
    result[key] = v;
  }
  // The outer split is fixed; input priorities only divide the other 40%.
  result.terrain = 60;
  return result;
}
export type FactorResult = {
  key: Factor;
  score: number | null;
  shared: string[];
  contribution: number;
};
export function weightAnalogs(
  matches: Match[],
  target: SiteEvidence,
  weights: AnalogWeights,
): Match[] {
  const otherTotal = (Object.keys(factorLabels) as Factor[]).reduce(
    (s, key) => s + (key === "terrain" ? 0 : weights[key]),
    0,
  );
  return matches
    .map((candidate) => {
      const earth = earthSiteEvidence(candidate);
      const factors = (Object.keys(factorLabels) as Factor[]).map((key) => {
        const a = target.factors[key],
          b = earth?.factors[key];
        const shared =
          a && b ? a.traits.filter((t) => b.traits.includes(t)) : [];
        // Qualitative tags earn only documented shared-trait credit. Unknown is never a match.
        const score =
          key === "terrain"
            ? candidate.profileSimilarity
            : a && b
              ? (100 * shared.length) / a.traits.length
              : null;
        return {
          key,
          score,
          shared,
          contribution:
            key === "terrain"
              ? 0.6 * (score ?? 0)
              : otherTotal > 0
                ? (0.4 * weights[key] * (score ?? 0)) / otherTotal
                : 0,
        };
      });
      return {
        ...candidate,
        terrainScore: candidate.score,
        score: factors.reduce((s, f) => s + f.contribution, 0),
        analog: {
          factors,
          coverage:
            60 +
            (otherTotal > 0
              ? (40 *
                  factors.reduce(
                    (s, f) =>
                      s +
                      (f.key !== "terrain" && f.score !== null
                        ? weights[f.key]
                        : 0),
                    0,
                  )) /
                otherTotal
              : 0),
          earth,
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}
