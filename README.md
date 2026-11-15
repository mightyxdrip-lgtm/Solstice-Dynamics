# Solstice Dynamics

Team TerraVector’s playable entry project for **Build a Junior Astronaut Mission Trainer**, NASA Space Apps Challenge 2026. Command a four-person Mars outpost for seven sols. Explore the outpost on foot, operate its equipment and return the crew safely through seven sols.

## How to play

1. Download **Solstice-Dynamics.html** from the [latest release](https://github.com/mightyxdrip-lgtm/Solstice-Dynamics/releases/latest).
2. Open the downloaded file in Chrome, Edge or another browser with WebGL 2 enabled.
3. Watch the intro or select **Skip intro**. On the home page, choose **Play** to begin the first shift or **Resume** to continue your saved mission.
4. Follow the arrow at the top of the screen. Move close to the equipment and press **E**, click its prompt or press **A / Cross** on a controller.
5. Complete the hands-on task, then follow the next arrow. Return to the habitat's mission console to finish each shift.

The full game starts with the intro and home page. **Solstice-Dynamics-Rover-Survey.html** starts at the sampling site, and **Solstice-Dynamics-Final-Choice.html** starts at the ending decision.

The full game includes its 3D models and offline advisor. Browser storage support for file URLs varies. For a stable autosave location, use the local server described below.

### Controls

| Action | Keyboard and mouse | Xbox / PlayStation controller |
| --- | --- | --- |
| Walk | W, A, S, D | Left stick |
| Look around | Move or drag the mouse, or use arrow keys | Right stick |
| Sprint | Hold Shift while moving | Hold left-stick click while moving |
| Use nearby equipment / board rover | E, or click the on-screen prompt | A / Cross |
| Drive / reverse | W / S, or Up / Down | Right / left trigger, or left stick |
| Steer the rover | A / D, or Left / Right | Left stick |
| Select an equipment tool | Q / R | Left / right bumper |
| Grab / release a tool | E or Enter | A / Cross |
| Move a grabbed tool | W, A, S, D or arrow keys | D-pad |
| Select a rock | Click it, or Left / Right then E | D-pad then A / Cross |
| Drill the rock | Hold E or the drill button | Hold A / Cross |
| Stow / deliver the core | E, or click the action button | A / Cross |
| Navigate menus | Click, or Tab then Enter | D-pad or left stick, then A / Cross |
| Pause / return | Escape | Menu / Options or B / Circle |

Connect a standard Xbox or PlayStation controller and press a face button to activate it. On a touchscreen, use the movement buttons, drag to look, and tap the equipment prompts. Hold the drill button to extract the sample.

### Your first mission

1. **Suit up.** Find the EVA rack in the habitat and equip your suit.
2. **Go outside.** Use the airlock and follow the arrow to the rover.
3. **Collect a sample.** Drive to the flag on the map, choose the blue crystal, hold the drill control until the core comes out, and stow it on the rover.
4. **Bring it home.** Drive to the home marker and give the core to the lab.
5. **Restore power.** Follow the arrow to the solar array, probe the contacts, fix or isolate the faulty connection, then check and route the power.
6. **Finish the shift.** Return to the habitat's mission console, select a response to the advisory and advance to the next sol.

Later shifts cover water recycling, plant care, radiation shelter preparation and habitat maintenance. Complete all seven shifts to reach the final sandstorm decision.

### Finding your way and saving

- The top-center arrow shows the next task and its distance. After 45 seconds of searching, a yellow task sign appears through walls.
- Read the short action above the equipment and match the visible shapes, colors or marked positions. Open **Help** for more instructions.
- Completed actions save automatically. Choose **Resume** on the home page to continue.
- To start over, pause, choose **Restart mission**, then confirm replacing your save.
- Return through an airlock before your suit oxygen or battery runs out.

### Run from source

For a GitHub checkout, install Node.js 22.18 or later. From this directory run:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4173**. The downloadable source archive includes a production build, so it can start with `npm start`. Once built, the game plays offline. Stop the server with Ctrl+C. The optional Gemini advisor uses `GEMINI_API_KEY` from the server environment. Set `PORT` to select a different port and `HOST` when deploying to a host that requires another bind address.

### Detailed equipment walkthrough

1. Follow the helmet marker to the EVA rack and equip your suit.
2. Cycle the habitat airlock and follow the arrow to the rover. Press **E** to board. Drive with **W/S** and steer with **A/D**, or use the arrows. Follow the map flag into the survey ring. Tap the blue crystal, hold the drill control until the core comes out, then tap the rover’s sample tube to stow it. You can also aim with Left/Right and use **E** for each action. Drive the core home and place it in the lab tray to unlock the solar task. Each completed action is saved.
3. Sample all three strings at junction J-2, identify the failed relay, then match both jumper leads or isolate the bad string. Walk to the separate power bus, match the load tester to the meter and dispatch the available power. An optional array extension immediately spends 3 kWh and two spares, adds a physical rack and increases clear-sky capacity by 8 kWh per sol.
4. Return through the habitat airlock. At the mission console, review the shift, respond to the advisory and advance the sol.
5. Later shifts require pressure-tap diagnosis, filter bypass adjustment, greenhouse lamp and irrigation control, shelter preparation, seal testing and final commissioning. The mission console accepts a handover after the field checks pass and an advisory response is selected. See [Field science and provenance](SCIENCE.md) for the data behind each mission.

Open the **History**, **Log**, **Manual** and **AURA** tabs at the habitat mission console. The pause menu provides graphics quality and a confirmed restart. Fresh colonies can use a tested strategy of extending the array on Sol 1, taking the first advisory response each sol and keeping the greenhouse in its safe band on Sol 3. Keep one spare for the worn seal.

The field instruments are built into their 3D equipment. Drag the metal probe to each contact, seat the shaped cable plugs, turn handwheels, slide the greenhouse controls and pull the breaker handles. A handle or plug only engages within its marked travel or matching socket. For keyboard operation, select a tool with Q/R, grab it with E or Enter, move it with WASD or the arrow keys, and press E or Enter to release. Tool selection restores game focus after opening Help. Escape leaves the instrument.

## Surface operations

Three.js, React Three Fiber and Drei render the exterior and three walkable interiors using WebGL 2. The camera stands at 1.62 m, with a 0.29 m collision radius. First-person movement uses substeps and sliding collisions against the structures and interior furnishings. Procedural terrain supplies the ground heights. The pressure cycle transfers the player between exterior and interior spaces. Graphics quality adjusts rendering resolution and shadows. High uses supersampled rendering, sharper terrain textures and an articulated sun shadow that follows the player across the surface. A terrain-following suit silhouette provides a shadow indoors and in Performance mode, which renders at native resolution.

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

