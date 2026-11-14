import {useEffect,useState} from 'react'
import {calculate,type State} from './engine'
import {fieldAction,status,safeBed} from './tasks'
import {stationNames} from './navigation'
import {Science,archive} from './science'
import './workshop.css'

export function Workshop({s,id,apply,close,cue}:{s:State;id:string;apply:(n:State)=>void;close:()=>void;cue:(ok:boolean)=>void}){
 const f=s.fieldwork!,m=status(s),step=f.step,b=calculate(s),sol=s.sol
 const [message,say]=useState(''),[lead,pick]=useState(-1),[dial,tune]=useState(0),[running,run]=useState(false)
 const action=(cmd:string,val=0)=>{const next=fieldAction(s,id,cmd,val),ok=next!==s;cue(ok);if(ok){apply(next);say(next.fieldwork!.step>step?'Check passed.':'Reading captured.')}else say('Check outside tolerance. Compare the readings and try again.');return ok}
 useEffect(()=>{if(!running)return
  const timer=setTimeout(()=>{if(m.complete||id!==m.station||step!==2||!action('tick'))run(false)},850)
  return()=>clearTimeout(timer)
 },[running,s,id])
 const button=(title:string,cmd:string,v=0)=><button key={title} onClick={()=>action(cmd,v)}>{title}</button>
 const samples=(labels:string[],values:string[])=> <div className="channels">{labels.map((l,i)=><button key={l} onClick={()=>action('scan',i)} aria-label={'Probe '+l}><small>{l}</small><strong>{f.samples&(1<<i)?values[i]:'— —'}</strong><span>{f.samples&(1<<i)?'SAMPLED':'TOUCH PROBE'}</span></button>)}</div>
 const knob=(label:string,value:number,max:number,set:(v:number)=>void,min=0,unit='')=><label className="knob"><span>{label}<strong>{value} {unit}</strong></span><input type="range" aria-label={label} min={min} max={max} value={value} onChange={e=>set(+e.target.value)}/></label>
 const meter=(label:string,val:string)=><div className="meter"><small>{label}</small><b>{val}</b></div>
 const live=m.station===id&&!m.complete
 const plug=(socket:number)=>{if(lead<0){say('Select a lead first.');return}if(action('wire',lead*2+socket))pick(-1)}
 return <section className="workbench"><header><div><small>ARES FIELD SYSTEMS　/　SOL {String(sol).padStart(2,'0')}</small><h2>{stationNames[id]}</h2></div><button aria-label="Close instrument" onClick={close}>×</button></header>
 <div className="bench-body"><div className="bench-title"><i/>{m.title}<b>{step} / {m.total}</b></div>
 {m.complete?<><h3>Mission complete</h3><p>{sol===1?'Generation rose from '+calculate({...s,fieldwork:{...f,solar:'fault'}}).solar+' to '+b.solar+' kWh/sol. Dispatch priority: '+s.settings.priority+'.':sol===2?'Recovery verified. '+b.recovered+' L/sol returned to the loop.':sol===3?'Stable crop cycle. Projected yield: '+b.harvest+' rations.':sol===4?'All four crew have a powered shelter berth.':'Equipment passed its field checks.'}</p><Science sol={sol}/></>:!live?<><h3>{m.tip}</h3><p>Next station · {stationNames[m.station]}</p></>:<>
 <h3 key={step}>{m.checks[step]}</h3><p>{m.tip}</p>
 {sol===1&&<>
 {step===0&&<>{meter('FAULTED ARRAY',b.solar+' kWh/sol')}{samples(['String A','String B','String C'],['31.8 V','0.4 V','31.6 V'])}</>}
 {step===1&&<><div className="instruments">{meter('A','31.8 V')}{meter('B','0.4 V')}{meter('C','31.6 V')}</div><div className="keys">{['A','B','C'].map((x,i)=>button('Flag string '+x,'identify',i))}</div></>}
 {step===2&&<><p>Match each shaped plug to its socket. Select a lead, then its matching port.</p><div className="patchbay">{['● ROUND','▲ TRIANGLE'].map((x,i)=><button draggable key={x} disabled={!!(f.plugs&(1<<i))} aria-pressed={lead===i} onDragStart={()=>pick(i)} onClick={()=>pick(i)}>{x} lead {f.plugs&(1<<i)?'✓':''}</button>)}{[1,0].map(i=><button key={i} disabled={!!(f.plugs&(1<<i))} onDragOver={e=>e.preventDefault()} onDrop={()=>plug(i)} onClick={()=>plug(i)}>{i?'△ Triangle':'○ Round'} socket</button>)}</div><button className="alternative" onClick={()=>action('isolate',1)}>Isolate B instead · retain 80% capacity</button></>}
 {step===4&&<><div className="instruments">{meter('GENERATION',b.solar+' kWh')}{meter('BATTERY',s.reserves.power+' kWh')}</div><p>Life support favors air and water. Greenhouse favors the harvest.</p><div className="keys">{['Balanced','Life support','Greenhouse'].map((v,i)=>button('Dispatch · '+v,'dispatch',i))}</div></>}
 </>}
 {((sol===1&&step===3)||(sol===7&&step===1))&&<><div className="instruments">{meter('ARRAY METER',b.solar+' kWh/sol')}{meter('TEST TARGET',Math.round(b.solar)+' kWh')}</div>{knob('Test load',dial,Math.max(45,Math.ceil(b.solar)+5),tune,0,'kWh')}<button onClick={()=>action('load',dial)}>Run load test</button></>}
 {sol===2&&<>{step===0&&samples(['Filter inlet','Filter outlet'],['72 kPa','31 kPa'])}{step===1&&<><p>Inlet 72 kPa → filter → outlet 31 kPa. Which component separates the readings?</p><div className="keys">{['Storage tank','Filter cartridge','Cabin tap'].map((x,i)=>button(x,'identify',i))}</div></>}{step===2&&<>{meter('BYPASS PRESSURE',(31+f.pump*7)+' kPa')}{knob('Bypass valve',f.pump,6,v=>action('valve',v))}<p>Target band 56–62 kPa.</p>{button('Seal bypass','seal')}</>}{step===3&&<>{meter('PREDICTED RETURN',b.recovered+' L/sol')}{button('Run flow test · collect sample','flow')}</>}</>}
 {sol===3&&<>{step===0?samples(['Canopy light','Root moisture'],[f.lamp+'%','Dry']):<>{knob('Lamp output',f.lamp,100,v=>action('lamp',v),25,'%')}{knob('Irrigation',f.irrigation,7,v=>action('water',v),1,'L')}<div className="instruments">{meter('GROW LOAD',(f.lamp*.14).toFixed(1)+' kWh')}{meter('HARVEST',b.harvest+' rations')}</div><p>Grow band · 55–75% light and 3–5 L water.</p>{step===1?button('Lock grow settings','stabilize'):<><progress value={f.dwell} max="4"/><button disabled={running||!safeBed(f)} onClick={()=>run(true)}>{running?'Monitoring '+f.dwell+'/4':'Monitor growth cycle'}</button></>}</>}</>}
 {sol===4&&<>{step===0&&<><p>{archive.flare.record}</p><p>{archive.dose.context} · {archive.dose.record}</p><small>What did the flare record measure?</small><div className="keys">{['Mars surface dose','Solar X-ray brightness','ISS absorbed dose'].map((x,i)=>button(x,'archive',i))}</div></>}{step===1&&<>{meter('AVAILABLE',s.reserves.power+' kWh')}{button('Energize air loop · 3 kWh','charge')}</>}{step===2&&<div className="keys">{['Commander','Medic','Botanist','Engineer'].map((x,i)=><button key={x} disabled={!!(f.crew&(1<<i))} onClick={()=>action('berth',i)}>{x} {f.crew&(1<<i)?'✓':'→ berth'}</button>)}</div>}{step===3&&button('Verify four occupied berths','pressure')}</>}
 {sol===5&&<>{step===0?samples(['Inner seal','Outer seal'],['−0.1 kPa','−4.8 kPa']):step===1?<div className="keys">{button('Inner · −0.1 kPa','identify')}{button('Outer · −4.8 kPa','identify',1)}</div>:<>{knob('Circulation selector',dial,1,tune)}<p>0 standby · 1 normal</p><button onClick={()=>action('sealtest',dial)}>Pressure test</button></>}</>}
 {sol===6&&<>{step===0?samples(['Bed A','Bed B'],['Moist','Dry']):step===1?<>{knob('Cycle volume',dial,7,tune,0,'L')}{button('Meter cycle','valve',dial)}</>:button('Verify standard cycle · 4 L','flow')}</>}
 {sol===7&&step===0&&samples(['Array bus'],[b.solar+' kWh'])}
 </>}
 <div aria-live="polite" className="bench-msg">{message}</div></div><footer><small>LOCAL EQUIPMENT LINK</small><button onClick={close}>Return to field ↗</button></footer></section>
}

