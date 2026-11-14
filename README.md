# MARS//CONTROL

Team TerraVector’s playable entry project for **Build a Junior Astronaut Mission Trainer**, NASA Space Apps Challenge 2026. Command a four-person Mars outpost for seven sols. Explore the outpost on foot, operate its equipment and return the crew safely through seven sols.

## Play the included build

The separate MARS-CONTROL.html download opens directly in a modern browser. It contains the entire game, including the scene and offline advisor. To regenerate it after a build, run npm run standalone. Browser storage support for file URLs varies. The local server provides a stable origin for autosave.

For the local server, install Node.js 22.18 or later. From this directory run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. The included production build runs without a package install, internet connection, account or API key. Stop the server with Ctrl+C. The local server supports the optional Gemini advisor. Set `PORT` to select a different port and `HOST` when deploying to a host that requires another bind address.

## First shift

Click **Begin mission** on the rendered title screen. You wake up inside the habitat. Walk with WASD, look with the mouse, hold Shift to sprint and press E near the equipment you are facing. Escape pauses the mission and releases mouse capture. Arrow keys or click-and-drag also turn the view. Touch devices have movement buttons, drag-look and a tap-to-interact prompt.

1. Inspect life support, then walk to the EVA rack and equip your suit.
2. Follow the objective bearing to the airlock at the far end of the corridor. Cycle it and walk to the solar array.
3. Diagnose the array. Set and apply its power priority. An optional array extension immediately spends 3 kWh and two spares, adds a physical rack and increases clear-sky capacity by 8 kWh per sol.
4. Return through the habitat airlock. At the mission console, review the shift, respond to the advisory and advance the sol.
5. Each later sol assigns a field inspection. Enter the water plant or greenhouse through its pressure door, or work outside at the array or shelter. Return to the mission console for handover.

Open the **History**, **Log**, **Manual** and **AURA** tabs at the habitat mission console. The pause menu provides graphics quality and a confirmed restart. Fresh colonies can use a tested strategy of extending the array on Sol 1, taking the first advisory response each sol and reducing irrigation starting on Sol 3. Keep one spare for the worn seal.

## Surface operations

Three.js, React Three Fiber and Drei render the exterior and three walkable interiors using WebGL 2. The camera stands at 1.62 m, with a 0.29 m collision radius. First-person movement uses substeps and sliding collisions against the structures and interior furnishings. Procedural terrain supplies the ground heights. The pressure cycle transfers the player between exterior and interior spaces. Graphics quality adjusts rendering resolution and shadows.

EVA oxygen and suit battery drain with elapsed play time outdoors. Sprinting increases both rates. Pressurized rooms refill the suit. An emergency return costs 6 kWh and 9 crew points. Opening a terminal or pausing suspends EVA consumption. The time compression and automatic return are training mechanics. Colony stores and weather advance one sol at a time. All four essential stores must stay above zero, crew condition at or above 60%, and equipment condition at or above 30%.

The game autosaves location, equipment, objectives, suit reserves and colony state on this browser. Existing colony saves resume at the habitat with new spatial objectives. Airlocks, furniture, equipment enclosures, panel arrays, terrain, sky, lighting and dust are generated locally. No external model downloads are required.

## Build and test

The client uses React, TypeScript, Vite, Lucide icons and custom responsive CSS. The engine is pure TypeScript and has no package dependencies. Node's built-in test runner executes it directly.

```sh
npm ci
npm test
npm run build
npm start
```

For a development server, run `npm run dev` and open Vite’s printed address. The production server is the entry point for testing the optional Gemini integration. Field tests cover camera-relative walking, collisions, terrain and proximity interactions. The core tests cover budgets, energy, water, oxygen, crop output, radiation, maintenance, emergency choices, serialization, replay determinism and both mission outcomes.

## Deployment

**Static:** run the build and upload the contents of `dist/` to the root of a static web host. This hosts the complete offline-guidance game. The browser needs only the files in that folder.

**With Gemini:** deploy the project with the built `dist/`, `server.mjs` and `src/engine.ts`. Use `npm start` as the launch command, set the platform’s port and bind address, and put `GEMINI_API_KEY` in the server’s private environment. Override `GEMINI_MODEL` to select an available GenerateContent model for your account. The default is `gemini-3.5-flash`. The game sends the advisor question, recent conversation and current simulation snapshot to the server. The server contacts Gemini using a header. Only advisor text is returned. Configure access at your hosting layer before exposing a paid advisor publicly.

The UI labels its predetermined advice **Offline guidance** when the server has no key. A failed upstream request also displays an offline response. The AI cannot modify state, award resources or advance the mission.

## Engineering model

`src/engine.ts` defines the starting scenario, weather schedule, emergency responses, operations, forecasts and turn resolution. There is no random number generator. The initial state and ordered player actions uniquely determine every numerical result. The same calculator powers both previews and committed turns.

| Quantity | Training assumption |
| --- | --- |
| Storage capacity | 20 kg oxygen, 100 L water, 40 rations, 100 kWh battery |
| Crew consumption | 3.4 kg oxygen, 12 L crew water and 4 rations per sol |
| Equipment efficiency | 0.55 + 0.45 × condition / 100 |
| Array generation | (34 + 8 × extensions) × sunlight fraction × equipment efficiency, in kWh per sol |
| Power budget | Battery + sunlight generation + signed response adjustment. After this, simultaneous loads draw power and the surplus is stored up to capacity. |
| Life support | Normal air production requests 10 kWh. Conservation requests 6 kWh. Life-support priority adds 3 kWh to air and 2 kWh to the recycler. |
| Water recovery | At most 12 L, computed as 12 L × recovery coefficient × equipment efficiency × powered fraction × recycler load / 7 |
| Crop production | 3.2 rations × relative lamp power × equipment efficiency × powered fraction × available irrigation fraction, plus any powered mature-crop bonus |
| Radiation | Six crew points per hazard level above available permanent and temporary protection |
| Maintenance | Five equipment points per sol. Repair restores up to 22 points. |

The model tracks stored consumables. The oxygen percentage is tank fill, independent of atmospheric oxygen concentration. Rations represent a crew-day fraction of stored food; four rations feed the four-person crew for one sol. A simplified air plant draws external feedstock, and mature crops are present at landing. The low/standard/high irrigation settings schedule the corresponding lamp loads together. Daily production is aggregated, so the model omits night-time power curves, actual plant maturation, detailed pressure chemistry and radiation dose. Temperature and wind describe scripted conditions; solar exposure enters the power equation directly. Equipment condition represents shared infrastructure. Emergency power savings are accounted for as signed changes to the energy budget. The pause menu suspends field movement and EVA consumption.

The filter fault on Sol 2 reduces the recovery coefficient by 0.15. Replacement restores the coefficient permanently. Flushing restores it for one shift.

The first forecast uses the current settings and no emergency adjustment until a response is chosen. Engineering actions are limited to two per sol, and supplies already committed to a selected response are reserved. Each sol’s final reserves and decisions are recorded for debrief.

## Educational references

- Mars environment and sol length. [NASA Mars facts](https://science.nasa.gov/mars/facts/)
- Water recovery and regenerative life support aboard the ISS. [NASA ECLSS](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/)
- Observed loss of solar generation during dust storms. [NASA InSight after a dust storm](https://www.nasa.gov/solar-system/nasas-insight-sees-power-levels-stabilize-after-dust-storm/)
- Water, lighting and nutrient demands of crops. [NASA growing plants in space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/)
- Shelter planning and exposure time. [NASA radiation protection on Mars](https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/)
- Project context. [NASA Space Apps challenge](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)

The engineering values, crew, outpost, weather and scenarios are fictional. NASA’s educational references inform the concepts. The trainer has no NASA operational certification. Colony models, material textures and terrain are original procedural assets. The supplied reference screenshots are excluded from the distributed game. Third-party client library notices are included in `NOTICE.txt`.

