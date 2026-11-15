export type Zone='outside'|'hab'|'green'|'water'
import {roverBay} from './roverRoute.ts'
export interface Pose {x:number;z:number;yaw:number;pitch:number;zone:Zone}
export interface Box {x:number;z:number;hx:number;hz:number}
export interface Circle {x:number;z:number;radius:number}
export interface Bounds {minX:number;maxX:number;minZ:number;maxZ:number}
export const capsuleRadius=.29
export const outsideBounds:Bounds={minX:-120,maxX:120,minZ:-120,maxZ:120}
export const outerStations=[
 roverBay,
 {id:'enterHab',x:-8,z:1.4}, {id:'enterWater',x:8.55,z:-6.65},
 {id:'enterGreen',x:6,z:8.32}, {id:'solar',x:-5.55,z:7.35},
 {id:'solarProbe',x:-5.55,z:3.9}, {id:'shelter',x:0,z:-8.8}
]
export const outerBoxes:Box[]=[
 {x:10,z:-9,hx:3.48,hz:2.22},{x:0,z:-12,hx:2.5,hz:2.85},
 {x:-8,z:.36,hx:.82,hz:.47},{x:6,z:7.6,hx:.84,hz:.48},
 {x:-5.55,z:3.9,hx:.45,hz:.27}, {x:-5.55,z:7.35,hx:.42,hz:.28},
 {x:12.5,z:1,hx:1.3,hz:.85}
]
for(const x of [-11.78,-8.22])for(const z of [5.86,8.2,10.54])outerBoxes.push({x,z,hx:1.6,hz:.93})
export function obstructed(x:number,z:number,b:Bounds,boxes:Box[],circles:Circle[],r=capsuleRadius){
 if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return true
 for(const a of boxes){
  const dx=Math.max(Math.abs(x-a.x)-a.hx,0),dz=Math.max(Math.abs(z-a.z)-a.hz,0)
  if(dx*dx+dz*dz<r*r)return true
 }
 return circles.some(a=>(x-a.x)**2+(z-a.z)**2<(a.radius+r)**2)
}
export function walk(p:Pose,side:number,forward:number,meters:number,blocked:(x:number,z:number)=>boolean){
 const len=Math.hypot(side,forward)
 if(!len)return 0
 const dx=(side*Math.cos(p.yaw)-forward*Math.sin(p.yaw))*meters/len
 const dz=(-side*Math.sin(p.yaw)-forward*Math.cos(p.yaw))*meters/len
 const steps=Math.max(1,Math.ceil(meters/.15)),startX=p.x,startZ=p.z
 for(let i=0;i<steps;i++){
  if(!blocked(p.x+dx/steps,p.z))p.x+=dx/steps
  if(!blocked(p.x,p.z+dz/steps))p.z+=dz/steps
 }
 return Math.hypot(p.x-startX,p.z-startZ)
}
export const stationNames:Record<string,string>={rover:'Board survey rover',solarProbe:'J-2 array junction',waterGauge:'Differential pressure taps',greenSensor:'Bed 03 sensor head',life:'Life-support console',suit:'EVA suit rack',reports:'Mission console',exit:'Cycle airlock',enterHab:'Habitat airlock',enterWater:'Water plant airlock',enterGreen:'Greenhouse airlock',solar:'Solar power terminal',shelter:'Shelter controls',water:'Water processor',green:'Greenhouse controls'}
export function nearestStation(p:Pose,stations:{id:string,x:number,z:number}[]){
 let nearest='',best=Infinity
 for(const s of stations){
  const dx=s.x-p.x,dz=s.z-p.z,d=Math.hypot(dx,dz)
  if(d>3.2)continue
  const facing=d>.001?(-Math.sin(p.yaw)*dx-Math.cos(p.yaw)*dz)/d:1
  // Equipment beside the player is usable without pinpoint aiming. Farther
  // targets must be in front; favor the one being looked at when stations overlap.
  if(d>1.8&&facing<.40)continue
  const score=d+(1-facing)*.65
  if(score<best){best=score;nearest=s.id}
 }
 return nearest
}
export const steps=[
 ['life','Inspect life support','Check the habitat’s life-support console.'],
 ['suit','Equip your EVA suit','Find the suit rack inside the habitat.'],
 ['exit','Cycle the airlock','Use the habitat airlock to begin your EVA.'],
 ['solar','Diagnose the solar array','Walk to the outdoor power terminal.'],
 ['solar','Allocate colony power','Apply a power priority at the solar terminal.'],
 ['enterHab','Return to the habitat','Cycle the habitat airlock to return inside.'],
 ['reports','Review shift results','Use the mission console to review the plan.'],
 ['reports','Complete the shift','Choose an advisory response and advance the sol.']
] as const

