import {useMemo} from 'react'
import {Flag,House,ArrowUp,Gem} from 'lucide-react'
import {terrainHeight,boulderColliders} from './terrain'
import {roverBay,surveyBeacon} from './roverRoute'
import type {Pose} from './navigation'

export function RoverMap({pose,returning}:{pose:Pose;returning:boolean}){
 const left=Math.min(-19,pose.x-6),top=Math.min(-14,pose.z-6)
 const width=Math.max(35,pose.x+6)-left,height=Math.max(62,pose.z+6)-top
 const relief=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=244
  const ctx=canvas.getContext('2d')!,data=ctx.createImageData(244,244)
  for(let z=0;z<244;z++)for(let x=0;x<244;x++){
   const h=terrainHeight(x-122,z-122),slope=h-terrainHeight(x-123,z-123)
   const contour=Math.floor(h*2)!==Math.floor(terrainHeight(x-121,z-122)*2)?9:0
   const shade=Math.round(Math.min(40,Math.max(-14,slope*8+h*.6)))+contour
   data.data.set([48+shade,56+shade,51+shade,255],(z*244+x)*4)
  }
  ctx.putImageData(data,0,0);return canvas.toDataURL()
 },[])
 const mark=(site:typeof roverBay,base:boolean,active:boolean)=>{
  const Icon=base?House:Flag
  return <g transform={`translate(${site.x} ${site.z})`}><circle r={active?4.3:3.5} fill={active?'#f7bd78':'#a9dcc9'} stroke="#122123" strokeWidth=".65"/>
   <Icon x={-2.5} y={-2.5} width={5} height={5} stroke="#162624" strokeWidth={2.7}/></g>
 }
 return <aside className="rover-map" aria-label="Live rover map">
  <header>{returning?<House size={16}/>:<Flag size={16}/>} {returning?'Home base':'Survey beacon'} {returning&&<Gem size={15} color="#7fe6ff" aria-label="Rock core on board"/>}</header>
  <svg role="img" aria-label="North-up map showing home, survey beacon and your rover" viewBox={`${left} ${top} ${width} ${height}`}>
   <image href={relief} x="-122" y="-122" width="244" height="244"/>
   <path d={`M ${roverBay.x} ${roverBay.z} L ${surveyBeacon.x} ${surveyBeacon.z}`} fill="none" stroke="#ffcb90" strokeWidth=".65" strokeDasharray="1.5 1.4"/>
   {boulderColliders.filter(c=>c.x>left&&c.z>top&&c.x<left+width&&c.z<top+height).map((c,i)=><circle key={i} cx={c.x} cy={c.z} r={c.radius} fill="#807c6b"/>)}
   {mark(roverBay,true,returning)}{mark(surveyBeacon,false,!returning)}
   <path aria-label="Rover position" transform={`translate(${pose.x} ${pose.z}) rotate(${-pose.yaw*180/Math.PI})`} d="M0 -3.2 2.35 2.3 0 1.15 -2.35 2.3Z" fill="#fff" stroke="#132226" strokeWidth=".65"/>
  </svg><small><ArrowUp size={11}/> N</small>
 </aside>
}
