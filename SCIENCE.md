# Field science and provenance

The registry in src/science.tsx ships with the offline build. Each entry identifies the agency, direct record, observation or finding, date and location when applicable, classification, mechanic and limits. Players see a short explanation when they finish a field assignment. Earlier explanations remain available in the mission console’s Log tab.

## Resource integration

The official [challenge Resources tab](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=resources) was inaccessible during verification. The [HackAthlone local event listing](https://hackathlone.com/challenges/junior-astronaut-mission-trainer) provided the seven resource links for review.

| Resource | Implementation decision |
| --- | --- |
| [NASA Mars Trek](https://trek.nasa.gov/mars/) | Reference the [Mars WMTS catalogue](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) and its MOLA relief. Terrain, adjacent rocks and structures are generated for the game. |
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Embed [event 30666](https://ccmc.gsfc.nasa.gov/DONKI/events/30666/2/) in the shelter exercise. Players identify the observable before the crew can prepare the refuge. |
| [NASA Open APIs](https://api.nasa.gov/) | DONKI has relevant records. Preserve a single identified event offline so a rate limit, changed alert or unavailable network cannot interrupt the lesson. |
| [NASA OSDR](https://osdr.nasa.gov/bio/repo/) | [OSD-267](https://osdr.nasa.gov/bio/repo/data/studies/OSD-267) and [VEG-01A](https://osdr.nasa.gov/bio/repo/data/payloads/VEG-01A) supply ISS crop context. The fictional greenhouse contains mature plants. |
| [NASA RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Compare a recorded ISS absorbed dose rate with a flare classification. The exact JSON query is linked within the radiation mission registry. [Field definition](https://visualization.osdr.nasa.gov/radlab/gui/knowledgebase/absorbed_dose_rate). |
| [CSA food production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Adapt the resource budgeting exercise from [Interplanetary farming](https://www.asc-csa.gc.ca/eng/youth-educators/activities/fitness-and-nutrition/interplanetary-farming.asp). The player controls lamp power and irrigation and observes yield. |
| [CSA youth STEM resources](https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp) | Use short repeatable hands-on trials suitable for an informal learning session. No numerical parameters come from this index. |

## Observations and model boundaries

The astronaut in the final sandstorm sequence wears a version of the [NASA Langley Z-2 spacesuit model](https://science.nasa.gov/3d-resources/z2-spacesuit/) animated for this game. The escape vehicle, blue sample, storm damage and flight sequence are fictional. The Z-2 is a visual reference independent of the challenge observation datasets.

On 10 May 2024 GOES-P EXIS observed the Sun’s X3.9 flare from Earth orbit. The event began at 06:27 UTC, peaked at 06:54 and ended at 07:06. RadLab records a separate measurement from DosTel1 on the ISS on 1 April 2022 at 23:00 UTC of 9.815504 µGy/h. No Mars dose or particle arrival time was derived from either record. The game’s power costs, exposure penalties and alert timing are fictional.

[NASA’s InSight storm report](https://www.nasa.gov/solar-system/nasas-insight-sees-power-levels-stabilize-after-dust-storm/) grounds the relationship between dust and available solar energy. [NASA’s life-support reference](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) informs the water recovery loop. The game’s solar voltages, wiring puzzle and pressure bands are illustrative instrument readouts. Simulated energy, crop and water budgets share the same colony state used for shift handover.

