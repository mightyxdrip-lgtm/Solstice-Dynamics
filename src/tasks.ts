import {calculate, type State, type Mode} from './engine.ts'
import {roverBay,surveyBeacon,homeBeacon,dockingRadius,crystalRock,surveyStages,type RoverAction,type Survey} from './roverRoute.ts'

export type Repair='fault'|'repaired'|'isolated'
export interface Fieldwork {
 version:1; sol:number; step:number; samples:number; plugs:number; solar:Repair
 pump:number; lamp:number; irrigation:number; dwell:number; crew:number; shelter:boolean
 survey?:Survey
}
export const enrollment=(s:State):State=>s.fieldwork?s:{...s,fieldwork:{version:1,sol:s.sol,step:0,samples:0,plugs:0,solar:s.sol===1?'fault':'repaired',pump:0,lamp:25,irrigation:1,dwell:0,crew:0,shelter:false}}
export const nextField=(f:Fieldwork,sol:number):Fieldwork=>({...f,sol,step:0,samples:0,plugs:0,dwell:0,crew:0,shelter:false})
export const missions=[
 {title:'Restore solar power',checks:['Scan the three array strings','Identify the failed relay','Bridge the fault or isolate it','Verify generation under load','Route the available power'],stations:['solarProbe','solarProbe','solarProbe','solar','solar'],tips:['Find junction J-2. Probe all three strings.','Compare the output traces. Select the failed string.','Connect both matching leads or isolate string B.','Walk to the power bus. Match the meter to the test load.','Set a power priority and commit the dispatch.']},
 {title:'Recover the water loop',checks:['Compare the pressure gauges','Locate the pressure loss','Balance the bypass valve','Verify recovered flow'],stations:['waterGauge','waterGauge','water','water'],tips:['Enter the plant and sample both pressure taps.','Identify the restriction from the two pressures.','At the process console, adjust the valve into the green band.','Run the recovery test and collect the reclaimed water.']},
 {title:'Stabilize the greenhouse',checks:['Scan the grow beds','Set lamp power and irrigation','Hold a stable growth cycle'],stations:['greenSensor','green','green'],tips:['Sample light and root moisture at the crop bed.','Find a light and water setting inside both safe bands.','Keep both channels stable through four growth checks.']},
 {title:'Prepare the radiation shelter',checks:['Interpret the archived alert','Power the shelter air loop','Assign four crew berths','Verify protected crew'],stations:['reports','shelter','shelter','shelter'],tips:['At mission control, identify what the archived flare measured.','Find the refuge. Bring its air loop online.','Move all four crew tags into the refuge roster.','Test the loop with the full crew assigned.']}
 ,{title:'Check the habitat seal',checks:['Compare both seal sensors','Select the leaking seal','Restore cabin circulation'],stations:['life','life','life'],tips:['At life support, probe the inner and outer seal.','Select the seal with the larger pressure loss.','Set normal circulation and retest the seal.']}
 ,{title:'Calibrate the irrigation loop',checks:['Measure both grow beds','Meter the dry bed','Verify water allocation'],stations:['greenSensor','green','green'],tips:['Use the bed sensors to compare moisture.','At the console, meter four liters into the cycle.','Verify the calibrated irrigation schedule.']}
 ,{title:'Commission the final power bus',checks:['Measure available generation','Certify the handover load'],stations:['solarProbe','solar'],tips:['Take a generation reading at junction J-2.','Set the load tester to the measured generation.']}
] as const
export function status(s:State){const m=missions[s.sol-1],f=s.fieldwork
 const step=f?.step||0,total=m?.checks.length||0
 // Earlier saves keep all their instrument readings. Crews already beyond the
 // first shift can still complete the new expedition before their final handover.
 const withSurvey=s.sol===1||(s.sol===7&&f?.survey!=='done'&&s.status==='active')
 if(withSurvey){
  const expedition=['Board the rover','Drive to the survey beacon','Pick the blue crystal','Drill a rock core','Stow the core','Return to home base','Give the core to the lab']
  const checks=[...expedition,...m.checks],leg=f?.survey??'parked'
  if(leg!=='done')return {step:surveyStages.indexOf(leg),total:checks.length,complete:false,title:'Bring back a rock core',checks,
   station:leg==='parked'?'rover':leg==='inbound'||leg==='unload'?'roverHome':'surveyBeacon',
   tip:leg==='parked'?'Board the rover beside the habitat.':leg==='outbound'?'Drive to the flag on your map.':expedition[surveyStages.indexOf(leg)]}
  return {step:step+expedition.length,total:checks.length,complete:step>=total,title:m.title,checks,station:m.stations[step]||'reports',tip:m.tips[step]||'Return to mission control.'}
 }
 return {step,total,complete:step>=total,title:m?.title||'Outpost handover',checks:m?.checks||[],station:m?.stations[step]||'reports',tip:m?.tips[step]||'Return to mission control and close the shift.'}
}
export function roverAction(s:State,action:RoverAction,pose:{zone:string;x:number;z:number},rock?:number):State{
 const f=s.fieldwork
 if(!f||s.status!=='active'||pose.zone!=='outside'||(s.sol!==1&&s.sol!==7)||f.survey==='done')return s
 const leg=f.survey??'parked'
 const steps:Record<Exclude<Survey,'done'>,[RoverAction,Survey,string]>={
  parked:['board','outbound','Rover departed for the sampling site.'],
  outbound:['arrive','chooseRock','Rover docked at the survey beacon.'],
  chooseRock:['pick','drill','Blue crystal deposit located.'],
  drill:['extract','stow','Rover drill extracted a rock core.'],
  stow:['pack','inbound','Rock core secured for the return trip.'],
  inbound:['arrive','unload','Rover docked beside the sample lab.'],
  unload:['deliver','done','Rock core delivered to the base lab.']
 }
 const [expected,survey,text]=steps[leg]
 if(action!==expected||(action==='pick'&&rock!==crystalRock))return s
 const target=leg==='parked'||leg==='inbound'||leg==='unload'?homeBeacon:surveyBeacon
 if(!(Math.hypot(pose.x-target.x,pose.z-target.z)<=dockingRadius))return s
 return {...s,fieldwork:{...f,survey},log:[...s.log,{sol:s.sol,text}]}
}
export const safeBed=(f:Fieldwork)=>f.lamp>=55&&f.lamp<=75&&f.irrigation>=3&&f.irrigation<=5
export function fieldAction(s:State,id:string,cmd:string,value=0):State{
 const f=s.fieldwork,m=status(s)
 if(id==='rover'||id==='surveyBeacon'||id==='roverHome')return s
 if(!f||f.sol!==s.sol||s.status!=='active'||m.complete||m.station!==id)return s
 const n=structuredClone(s),a=n.fieldwork!
 const sample=(count:number)=>{if(!Number.isInteger(value)||value<0||value>=count)return false;a.samples|=1<<value;if(a.samples===(1<<count)-1)a.step++;return true}
 let ok=false
 if(s.sol===1){
  if(f.step===0&&cmd==='scan')ok=sample(3)
  if(f.step===1&&cmd==='identify'&&value===1){a.step++;ok=true}
  if(f.step===2&&cmd==='wire'&&[0,3].includes(value)){a.plugs|=value===0?1:2;ok=true;if(a.plugs===3){a.step++;a.solar='repaired'}}
  if(f.step===2&&cmd==='isolate'&&value===1){a.solar='isolated';a.step++;ok=true}
  if(f.step===3&&cmd==='load'&&value===Math.round(calculate(s).solar)){a.step++;ok=true}
  if(f.step===4&&cmd==='dispatch'&&[0,1,2].includes(value)){n.settings.priority=(['balanced','life','crops'] as Mode[])[value];a.step++;ok=true}
 }else if(s.sol===2){
  if(f.step===0&&cmd==='scan')ok=sample(2)
  if(f.step===1&&cmd==='identify'&&value===1){a.step++;ok=true}
  if(f.step===2&&cmd==='valve'&&Number.isInteger(value)&&value>=0&&value<=6){a.pump=value;ok=true}
  if(f.step===2&&cmd==='seal'&&f.pump===4){a.step++;ok=true;n.recycled=Math.min(.85,n.recycled+.12)}
  if(f.step===3&&cmd==='flow'&&calculate(s).recovered>0){const free=Math.min(1,100-n.reserves.water,n.reserves.power/.4);if(free>=0){n.reserves.water=+(n.reserves.water+free).toFixed(2);n.reserves.power=+(n.reserves.power-free*.4).toFixed(2);a.step++;ok=true}}
 }else if(s.sol===3){
  if(f.step===0&&cmd==='scan')ok=sample(2)
  if((f.step===1||f.step===2)&&cmd==='lamp'&&Number.isInteger(value)&&value>=25&&value<=100){a.lamp=value;a.dwell=0;ok=true}
  if((f.step===1||f.step===2)&&cmd==='water'&&Number.isInteger(value)&&value>=1&&value<=7){a.irrigation=value;a.dwell=0;ok=true}
  if(f.step===1&&cmd==='stabilize'&&safeBed(f)){a.step++;ok=true}
  if(f.step===2&&cmd==='tick'&&safeBed(f)&&calculate(s).powered>=.95){a.dwell++;if(a.dwell>=4)a.step++;ok=true}
 }else if(s.sol===4){
  if(f.step===0&&cmd==='archive'&&value===1){a.step++;ok=true}
  if(f.step===1&&cmd==='charge'&&n.reserves.power>=3){a.shelter=true;n.reserves.power-=3;a.step++;ok=true}
  if(f.step===2&&cmd==='berth'&&Number.isInteger(value)&&value>=0&&value<4){a.crew|=1<<value;if(a.crew===15)a.step++;ok=true}
  if(f.step===3&&cmd==='pressure'&&f.shelter&&f.crew===15){a.step++;ok=true}
 }else if(s.sol===5){
  if(f.step===0&&cmd==='scan')ok=sample(2)
  if(f.step===1&&cmd==='identify'&&value===1){a.step++;ok=true}
  if(f.step===2&&cmd==='sealtest'&&value===1){n.settings.air='normal';n.condition=Math.min(100,n.condition+4);a.step++;ok=true}
 }else if(s.sol===6){
  if(f.step===0&&cmd==='scan')ok=sample(2)
  if(f.step===1&&cmd==='valve'&&value===4){a.irrigation=4;a.step++;ok=true}
  if(f.step===2&&cmd==='flow'){n.settings.irrigation='standard';a.step++;ok=true}
 }else if(s.sol===7){
  if(f.step===0&&cmd==='scan')ok=sample(1)
  if(f.step===1&&cmd==='load'&&value===Math.round(calculate(s).solar)){a.step++;ok=true}
 }
 if(!ok)return s
 if(a.step>f.step)n.log.push({sol:s.sol,text:m.title+' · '+m.checks[f.step]+'.'})
 return n
}

