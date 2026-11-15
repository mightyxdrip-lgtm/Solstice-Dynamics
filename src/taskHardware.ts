import {calculate,type State} from './engine'

export type Gesture='dock'|'turn'|'slide'|'pull'
export interface Grip {name:string; x:number; y:number; kind:Gesture; cmd:string; value?:number; min?:number; max?:number; initial?:number; color?:number; shape?:number; locked?:boolean; dest?:number; unit?:string; band?:[number,number];icon?:string;target?:number}
export interface Port {name:string;x:number;y:number;value:number;color?:number;shape?:number; level?:number; fault?:boolean;icon?:string}
export interface Hardware {title:string;hint:string;reading:string;grips:Grip[];ports:Port[]; progress?:number}
const amber=0xffab57,blue=0x69cde3,green=0x96d3a8
const dock=(name:string,x:number,y:number,cmd:string,value=0):Grip=>({name,x,y,kind:'dock',cmd,value})
const pull=(name:string,x:number,y:number,cmd:string,value=0):Grip=>({name,x,y,kind:'pull',cmd,value})
const turn=(name:string,x:number,cmd:string,min:number,max:number,initial:number,unit=''):Grip=>({name,x,y:.11,kind:'turn',cmd,min,max,initial,unit})
const port=(name:string,x:number,y:number,value:number):Port=>({name,x,y,value})
function buildHardware(s:State):Hardware{
 const f=s.fieldwork!,sol=s.sol,step=f.step,b=calculate(s)
 const pack=(title:string,hint:string,reading:string,grips:Grip[],ports:Port[]=[]):Hardware=>({title,hint,reading,grips,ports})
 function probe(names:string[],readings:string[]){
  const ports=names.map((n,i)=>({...port(n,names.length===1?.53:.0+i*(.98/(names.length-1)),.12,i),color:f.samples&(1<<i)?green:amber,level:f.samples&(1<<i)?((sol===1&&i===1)||(sol===3&&i===1)||(sol===6&&i===1)?0.05:sol===2&&i===1?.43:.95):undefined,fault:!!(f.samples&(1<<i))&&((sol===1||sol===3||sol===5||sol===6)&&i===1)}))
  const values=names.map((n,i)=>n+' '+(f.samples&(1<<i)?readings[i]:'—')).join('   /   ')
  return pack('Take a probe reading','Drag the probe tip from its cradle to each contact.',values,[dock('PROBE',-.88,.12,'scan')],ports)
 }
 function selector(title:string,cmd:string,labels:string[],reading:string){
  return pack(title,'Drag the selector pin into the chosen slot.',reading,[dock('SELECTOR',-.91,.1,cmd)],labels.map((n,i)=>({...port(n,.06+i*(.98/Math.max(1,labels.length-1)),.1,i),fault:cmd==='identify'&&i===1,level:cmd==='identify'?(i===1?.08:.95):undefined})))
 }
 function load(){return pack('Match the test load','Turn the dial to the meter reading, then pull TEST down.', Math.round(b.solar)+' kWh',[{...turn('LOAD',-.54,'local',0,Math.max(45,Math.ceil(b.solar)+5),0,' kWh'),band:[Math.round(b.solar),Math.round(b.solar)]},pull('TEST',.65,.23,'load')])}
 if((sol===1||sol===7)&&step===0)return sol===1?probe(['A','B','C'],['31.8 V','0.4 V','31.6 V']):probe(['BUS'],[b.solar+' kWh'])
 if(sol===1&&step===1)return selector('Find the failed string','identify',['A','B','C'],'A 31.8 V     B 0.4 V     C 31.6 V')
 if(sol===1&&step===2){
  const ports=[{...port('TRIANGLE',.87,.31,1),color:blue,shape:3},{...port('ROUND',.87,-.22,0),color:amber,shape:16}]
  const grips=[{...dock('ROUND',-.75,.31,'wire',0),color:amber,shape:16,locked:!!(f.plugs&1),dest:1},{...dock('TRIANGLE',-.75,-.22,'wire',1),color:blue,shape:3,locked:!!(f.plugs&2),dest:0},pull('ISOLATE',0,-.28,'isolate',1)]
  return pack('Reconnect the two leads','Grab each colored plug and drag it into the matching socket. Pull ISOLATE for reduced output.','● → ●     △ → △',grips,ports)
 }
 if(sol===1&&step===3||sol===7&&step===1)return load()
 if(sol===1&&step===4)return selector('Route available power','dispatch',['⚖','O₂','PLANTS'],b.solar+' kWh')
 if(sol===2){
  if(step===0)return probe(['INLET','OUTLET'],['72 kPa','31 kPa'])
  if(step===1)return selector('Flag the restriction','identify',['TANK','FILTER','TAP'],'INLET 72 kPa     OUTLET 31 kPa')
  if(step===2)return pack('Balance the bypass','Turn the handwheel into the pressure band, then pull SEAL down.','56–62 kPa',[{...turn('VALVE',-.54,'valve',0,6,f.pump),band:[4,4]},pull('SEAL',.65,.23,'seal')])
  return pack('Collect a flow sample','Drag the sample cartridge into the return manifold.',b.recovered+' L',[dock('SAMPLE',-.8,.12,'flow')],[port('RETURN',.77,.12,0)])
 }
 if(sol===3){
  if(step===0)return probe(['CANOPY','ROOT'],[f.lamp+'%','Dry'])
  if(step===1)return pack('Balance the grow bed','Slide both handles into the marked bands, then pull LOCK.','LIGHT 55–75%     WATER 3–5 L',[
   {name:'LIGHT',x:-.78,y:.06,kind:'slide',cmd:'lamp',min:25,max:100,initial:f.lamp,unit:'%',band:[55,75]},
   {name:'WATER',x:.02,y:.06,kind:'slide',cmd:'water',min:1,max:7,initial:f.irrigation,unit:' L',band:[3,5]},pull('LOCK',.88,.22,'stabilize')])
  return {...pack('Observe a stable cycle','Hold the RUN handle down through four consecutive readings.','●'.repeat(f.dwell)+'○'.repeat(4-f.dwell),[pull('RUN',0,.26,'tick')]),progress:f.dwell}
 }
 if(sol===4){
  if(step===0)return selector('Classify the archived signal','archive',['MARS DOSE','X-RAYS','ISS DOSE'],'GOES-P   X3.9   /   10 MAY 2024')
  if(step===1)return pack('Energize shelter air','Pull the main breaker fully down.','AIR LOOP  3 kWh',[pull('BREAKER',0,.25,'charge')])
  if(step===2){const labels=['01','02','03','04'];return pack('Assign crew berths','Drag each crew tag into its numbered berth.','01  02  03  04',labels.map((n,i)=>({...dock(n,-.96+i*.64,-.21,'berth',i),locked:!!(f.crew&(1<<i)),dest:i,color:[amber,blue,green,0xd99aca][i]})),labels.map((_,i)=>port('0'+(i+1),-.96+i*.64,.32,i)))}
  return pack('Pressure-test the refuge','Pull the test handle to verify the occupied shelter.','AIR LOOP ONLINE    /    4 BERTHS',[pull('TEST',0,.22,'pressure')])
 }
 if(sol===5){
  if(step===0)return probe(['INNER','OUTER'],['−0.1 kPa','−4.8 kPa'])
  if(step===1)return selector('Locate the leak','identify',['INNER','OUTER'],'INNER −0.1 kPa    OUTER −4.8 kPa')
  return pack('Restore circulation','Turn the selector to 1, then pull TEST.','0 STANDBY     1 NORMAL',[{...turn('MODE',-.54,'local',0,1,0),band:[1,1]},pull('TEST',.65,.23,'sealtest')])
 }
 if(step===0)return probe(['BED A','BED B'],['Moist','Dry'])
 if(step===1)return pack('Meter the dry bed','Turn the wheel to four liters, then pull METER.','TARGET  4 L',[{...turn('VOLUME',-.54,'local',0,7,0,' L'),band:[4,4]},pull('METER',.65,.23,'valve')])
 return pack('Verify irrigation','Pull the flow handle to check the standard cycle.','STANDARD  4 L',[pull('FLOW',0,.22,'flow')])
}

export function hardware(s:State):Hardware{
 const model=buildHardware(s)
 const shapes=['●','▲','■','◆']
 const colors=[amber,blue,green,0xe7a1c8]
 const sides=[32,3,4,4]
 for(const grip of model.grips){
  if(grip.kind==='slide'){grip.icon=grip.cmd==='lamp'?'☀':'≈';continue}
  if(grip.kind!=='dock')continue
  switch(grip.cmd){
   case 'wire':
   case 'berth':{
    const index=grip.value!
    const slot=model.ports[grip.dest!]
    grip.icon=slot.icon=shapes[index];grip.target=grip.dest
    grip.color=slot.color=colors[index];grip.shape=slot.shape=sides[index]
    break
   }
   case 'scan':
    grip.icon='◎';grip.target=model.ports.findIndex(p=>p.level===undefined)
    model.ports.forEach((p,i)=>p.icon=p.level!==undefined?'✓':shapes[i]);break
   case 'identify':
    grip.icon='!';grip.target=1;model.ports.forEach((p,i)=>p.icon=i===1?'!':'✓');break
   case 'archive':
    grip.icon='∿';grip.target=1;model.ports.forEach((p,i)=>p.icon=['☄','∿','☉'][i]);break
   case 'dispatch':
    grip.icon='ϟ';grip.target=0;model.ports.forEach((p,i)=>p.icon=['⚖','O₂','♧'][i]);break
   default:
    grip.icon='●';grip.target=0;model.ports.forEach(p=>p.icon='○')
  }
 }
 return model
}

