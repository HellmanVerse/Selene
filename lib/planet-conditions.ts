// Planet-wide context is not a local raster extraction or a site resource assessment.
export type Condition = {
  text: string;
  traits: string[];
  source: string;
  scope?: "planetary" | "regional";
  comparable?: boolean;
};
const c = (text: string, traits: string[], source: string): Condition => ({
  text,
  traits,
  source,
  scope: "planetary",
});
const mars = "https://science.nasa.gov/mars/facts/";
const moon = "https://science.nasa.gov/moon/facts/";
const earth = "https://science.nasa.gov/earth/facts/";
export const planetaryConditions = {
  mars: {
    geology: c(
      "Basaltic volcanic materials are widespread; sedimentary and altered rocks also occur. This default does not identify the rock beneath the selected point.",
      ["basalt", "volcanic"],
      "https://doi.org/10.1029/2002JE001913",
    ),
    temperature: c(
      "Mars is cold and dry. NASA gives approximate planet-wide extremes of −153°C to +20°C, not a forecast for this location.",
      ["cold", "dry"],
      mars,
    ),
    water: c(
      "Polar and buried water ice exist; ancient channels and lakebeds record past water. The default does not establish local accessible ice.",
      ["planetary-ice"],
      mars,
    ),
    dust: c(
      "Fine iron-bearing dust, winds and large dust storms affect the surface. Local grain size and dust loading vary.",
      ["aeolian"],
      "https://science.nasa.gov/solar-system/10-things-dust-in-the-wind-on-mars-and-well-beyond/",
    ),
    environment: c(
      "Gravity is about 0.38 Earth gravity. The thin, mostly CO₂ atmosphere and absence of a global magnetic field differ sharply from Earth’s shielding.",
      ["low-gravity", "thin-co2-atmosphere", "weak-global-shielding"],
      "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    ),
    illumination: c(
      "A sol lasts about 24.6 hours, with seasonal sunlight changes. Terrain shadows and local solar exposure still require calculation.",
      ["seasonal-daylight"],
      mars,
    ),
    biology: c(
      "Life has not been confirmed. Research targets ancient habitability and preservation of possible biosignatures.",
      ["biosignature-preservation"],
      mars,
    ),
    operations: {
      ...c(
        "Lower gravity, dust and thin air affect mobility, equipment and construction tests. These are engineering implications, not a local traversability assessment.",
        [],
        mars,
      ),
      comparable: false,
    },
  },
  moon: {
    geology: c(
      "Typical lunar materials include mare basalt, feldspar-rich highland anorthosite and impact breccia. No local rock type is inferred from this default.",
      ["basalt", "anorthosite", "impact"],
      "https://ares.jsc.nasa.gov/interaction/lmdp/lunarsampleset.cfm",
    ),
    temperature: c(
      "NASA lists roughly +127°C in full sunlight and −173°C in darkness. Polar cold traps can differ; these are global examples, not local measurements.",
      ["thermal-extremes"],
      moon,
    ),
    water: c(
      "Water ice occurs in some permanently shadowed polar regions; hydration also exists elsewhere. Local ice abundance and extractability are not implied.",
      ["polar-ice"],
      moon,
    ),
    dust: c(
      "Impact-produced regolith covers much of the surface. With no substantial atmosphere, lunar dust is not transported by weather like terrestrial windblown sand.",
      ["airless-impact-dust"],
      "https://www.nasa.gov/general/is-there-weather-on-the-moon-we-asked-a-nasa-scientist-episode-34/",
    ),
    environment: c(
      "Surface gravity is about one-sixth of Earth’s. A tenuous exosphere supplies almost no atmospheric shielding; radiation conditions differ from Earth.",
      ["low-gravity", "near-vacuum", "weak-global-shielding"],
      moon,
    ),
    illumination: c(
      "At many locations the sunlight–darkness cycle is about 29.5 Earth days. Polar illumination depends strongly on terrain.",
      ["long-day-night"],
      "https://science.nasa.gov/wp-content/uploads/2023/05/ladee-press-kit-08292013.pdf",
    ),
    biology: c(
      "The exposed surface has no established native biosphere. Life-detection field tests on Earth require contamination control rather than assuming ecological similarity.",
      ["no-established-biosphere"],
      moon,
    ),
    operations: {
      ...c(
        "Regolith, vacuum and reduced gravity affect traction, excavation and equipment. Soil strength and obstacle hazards need local measurements.",
        [],
        moon,
      ),
      comparable: false,
    },
  },
};
export const earthConditions = {
  environment: c(
    "Earth has about 9.8 m/s² gravity, a dense nitrogen–oxygen atmosphere and magnetic/atmospheric shielding. These outdoor conditions do not reproduce Moon or Mars conditions.",
    ["earth-gravity", "dense-nitrogen-oxygen", "global-shielding"],
    earth,
  ),
  dust: c(
    "Earth’s atmosphere supports wind-driven sediment transport. This planetary context does not confirm dunes, dust loading or erosion rates at this coordinate.",
    ["aeolian"],
    "https://science.nasa.gov/solar-system/10-things-dust-in-the-wind-on-mars-and-well-beyond/",
  ),
  illumination: c(
    "Earth has a roughly 24-hour day with seasonal daylight changes; topographic shading and polar day/night vary by site.",
    ["seasonal-daylight"],
    earth,
  ),
  water: {
    ...c(
      "Earth has liquid water, ice and a water cycle. Local dryness, groundwater or ice require regional data.",
      ["earth-water-cycle"],
      earth,
    ),
    comparable: false,
  },
  biology: {
    ...c(
      "Earth supports life; a site’s microbes and preservation conditions require local studies.",
      ["terrestrial-biosphere"],
      earth,
    ),
    comparable: false,
  },
};
