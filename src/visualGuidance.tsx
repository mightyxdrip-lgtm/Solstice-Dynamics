import {BatteryCharging,Check,DoorOpen,Droplets,Hand,HelpCircle,Leaf,Radio,ShieldCheck,Shirt,Sun,Wind,Wrench,Zap,House,Flag} from 'lucide-react'
export const stationLabels:Record<string,string>={rover:'Rover',surveyBeacon:'Survey beacon',roverHome:'Home base',suit:'Suit up',exit:'Airlock',enterHab:'Habitat',enterWater:'Water',enterGreen:'Greenhouse',solarProbe:'Solar',solar:'Power',waterGauge:'Water',water:'Water',greenSensor:'Plants',green:'Plants',reports:'Control',life:'Air',shelter:'Shelter'}
export function StationIcon({id,size=22}:{id:string,size?:number}){
 if(id==='rover')return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M4 13h15l-1 3H6zM8 13V5h5v3H8M17 12V9m-2-3 2 3 3-2M6 16v2m6-2v2m6-2v2"/>
  <circle cx="5" cy="20" r="2"/><circle cx="12" cy="20" r="2"/><circle cx="19" cy="20" r="2"/>
 </svg>
 if(id==='surveyBeacon'||id==='roverHome'){
  const Icon=id==='roverHome'?House:Flag
  return <Icon size={size} aria-hidden="true"/>
 }
 const Icon=id==='suit'?Shirt:id==='exit'||id.startsWith('enter')?DoorOpen:id.startsWith('solar')?Zap:id.startsWith('water')?Droplets:id.startsWith('green')?Leaf:id==='reports'?Radio:id==='shelter'?ShieldCheck:Wind
 return <Icon size={size} aria-hidden="true"/>
}
export const shortActions:Record<string,string>={'Take a probe reading':'Probe','Find the failed string':'Find fault','Reconnect the two leads':'Connect','Match the test load':'Match','Route available power':'Route power','Balance the bypass':'Turn','Collect a flow sample':'Connect','Flag the restriction':'Find blockage','Balance the grow bed':'Adjust','Observe a stable cycle':'Hold','Classify the archived signal':'Match signal','Energize shelter air':'Pull','Assign crew berths':'Match','Pressure-test the refuge':'Pull','Locate the leak':'Find leak','Restore circulation':'Turn','Meter the dry bed':'Turn','Verify irrigation':'Pull'}
export function ProgressDots({value,total}:{value:number,total:number}){return <div className="progress-dots" role="progressbar" aria-label="Mission progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>{Array.from({length:total},(_,i)=><i key={i} className={i<value?'done':i===value?'active':''}>{i<value?<Check size={10}/>:null}</i>)}</div>}
export {Hand,HelpCircle,Check,BatteryCharging,Wrench,Sun}

