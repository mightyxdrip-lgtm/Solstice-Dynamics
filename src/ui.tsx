import React, {useEffect,useRef,useState} from 'react'
import {X,ArrowUpRight,ChevronRight,Check,Send,AudioLines,Activity} from 'lucide-react'
import {calculate,current,capacities,pct,resources,units,events,type State,type Resource} from './engine'
export const labels:Record<Resource,string>={oxygen:'Oxygen',water:'Water',food:'Food',power:'Energy',crew:'Crew condition'}
export const colors:Record<Resource,string>={oxygen:'#73ccc7',water:'#82b8e4',food:'#acd495',power:'#e5b767',crew:'#b6a4dc'}
export function Modal({title,eyebrow,children,onClose}:{title:string,eyebrow:string,children:React.ReactNode,onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close()},[])
 return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}}><div className="dialog-inner"><div className="dialog-head"><div><small>{eyebrow}</small><h2>{title}</h2></div><button className="iconbtn" aria-label="Close panel" onClick={onClose}><X/></button></div>{children}</div></dialog>
}
export function History({s}:{s:State}){
 const [key,setKey]=useState<Resource|'all'>('all')
 const active=key==='all'?resources:[key]
 return <div className="history"><div className="sectionline"><h3>Resource history</h3><span className="mono">CAPACITY %</span></div>
 <div className="legend"><button className={key==='all'?'chosen':''} onClick={()=>setKey('all')}>All</button>{resources.map(k=><button key={k} className={key===k?'chosen':''} onClick={()=>setKey(k)}><i style={{background:colors[k]}}/>{labels[k]}</button>)}</div>
 <svg viewBox="0 0 600 186" role="img" aria-label="Recorded resource levels at the end of each sol"><g fill="none" stroke="#30383e">{[0,25,50,75,100].map(n=><path key={n} d={`M37 ${156-n*1.35}H580`}/>)}</g><g fill="#a9b2b7" fontFamily="monospace" fontSize="10">{[0,25,50,75,100].map(n=><text key={n} x="4" y={160-n*1.35}>{n}%</text>)}{Array.from({length:8},(_,i)=><text key={i} x={37+i*77} y="179" textAnchor="middle">{i===0?'Start':'S'+i}</text>)}</g>{active.map(k=><g key={k} stroke={colors[k]}><polyline fill="none" strokeWidth="2.2" points={s.history.map(h=>(37+h.sol*77)+','+(156-pct(h.reserves,k)*1.35)).join(' ')}/>{s.history.map(h=><circle key={h.sol} cx={37+h.sol*77} cy={156-pct(h.reserves,k)*1.35} r="3.4" fill={colors[k]}><title>{labels[k]} · Sol {h.sol} · {h.reserves[k]} {units[k]}</title></circle>)}</g>)}</svg>
 <details><summary>Recorded values</summary><div className="tablewrap"><table><thead><tr><th>Sol</th>{resources.map(k=><th key={k}>{labels[k]} ({units[k]})</th>)}</tr></thead><tbody>{s.history.map(h=><tr key={h.sol}><td>{h.sol}</td>{resources.map(k=><td key={k}>{h.reserves[k]}</td>)}</tr>)}</tbody></table></div></details></div>
}
export function Log({s}:{s:State}){return <div className="logs">{s.log.slice().reverse().map((v,i)=><div key={i}><small>SOL {String(v.sol).padStart(2,'0')}</small><p>{v.text}</p></div>)}</div>}
const sources=[
 ['Mars facts','Atmosphere, surface conditions and the length of a sol.','https://science.nasa.gov/mars/facts/'],
 ['Environmental Control and Life Support Systems','How the space station recovers water and generates oxygen.','https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'],
 ['InSight after a dust storm','Why reduced sunlight can threaten solar-powered missions.','https://www.nasa.gov/solar-system/nasas-insight-sees-power-levels-stabilize-after-dust-storm/'],
 ['Growing plants in space','Water, nutrients and electrical lighting for controlled crops.','https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/'],
 ['Protecting astronauts from space radiation','Exposure time and the role of storm shelters.','https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/'],
 ['Build a Junior Astronaut Mission Trainer','The 2026 NASA Space Apps Challenge brief.','https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/']]
export function Manual(){
 const [section,set]=useState('Flight guide')
 return <><div className="tabs">{['Flight guide','Model notes','NASA sources'].map(x=><button className={section===x?'active':''} onClick={()=>set(x)} key={x}>{x}</button>)}</div>
 {section==='Flight guide'?<div className="guide">{[
 ['Read the watch','Read reserve levels at life support and review the advisory at the habitat mission console. Keep every reserve above zero, crew condition at 60% or higher and equipment at 30% or higher.'],
 ['Issue orders','Walk to a local terminal, face the equipment and press E to adjust its operating mode. Spend up to two crew actions per sol on upgrades, repairs or a survey. Settings persist until you change them.'],
 ['Resolve the advisory','Compare the two responses. The projected reserves update when you change your plan. You can revise a response until you advance.'],
 ['Advance one sol','Commit the shift to record its decisions and resource levels. Complete all seven sols to qualify. Return to the habitat mission console to commit the shift.']].map(([a,b],i)=><article key={a}><b>0{i+1}</b><div><h3>{a}</h3><p>{b}</p></div></article>)}</div>:section==='Model notes'?<div className="reading"><p>One turn represents one Martian solar day, about 24 hours and 39 minutes. This fictional four-person outpost uses an educational engineering model designed by Team TerraVector.</p><h3>Supply and demand</h3><p>The array supplies 34 kWh under clear skies before equipment losses. An extension adds 8 kWh per clear sol. Weather multiplies generation by 0.35–1.00. Usable energy comes from generation plus the battery. Shortfalls scale powered production down proportionally.</p><h3>Air, water and crops</h3><p>The crew uses 3.4 kg of oxygen, 12 L of water and four rations per sol. Air production uses an abstract external feedstock. Recovered crew water offsets withdrawals. A mature crop consumes 2–7 L of extra irrigation. Crop lighting and irrigation change the harvest.</p><h3>Wear and radiation</h3><p>Equipment loses five condition points per sol and works less efficiently as it wears. Each unshielded hazard level costs six crew points. Weather, crop timing, normalized condition scores and shield levels are gameplay approximations. These values are unsuitable for life-support design or radiation dose assessment.</p></div>:<div className="source-list">{sources.map(([a,b,u])=><a href={u} target="_blank" rel="noreferrer" key={u}><span><strong>{a}</strong><small>{b}</small></span><ArrowUpRight size={16}/></a>)}</div>}</>
}
export function Wave(){return <span className="wave" aria-hidden="true">{[4,9,15,7,22,28,14,34,21,11,26,18,8,15,5].map((n,i)=><i key={i} style={{height:n}}/>)}</span>}
function localAnswer(s:State,q:string){
 const r=calculate(s),e=current(s),v=s.reserves
 if(s.status!=='active')return s.reason+' Open the debrief to compare the resource history with your recorded choices.'
 if(/water|recycl|irrigat/i.test(q))return `Water storage is ${v.water} L. This plan recovers ${r.recovered} L of the crew’s 12 L daily use. Low irrigation preserves water but cuts the greenhouse harvest.`
 if(/food|crop|greenhouse/i.test(q))return `The crew eats 4 rations per sol. Your greenhouse currently projects ${r.harvest} rations. Crop priority increases lamp power; check battery headroom first.`
 if(/radiat|shield|shelter/i.test(q))return `The current hazard is level ${e.risk} and permanent shielding is level ${s.shield}. Your current plan costs ${r.radiationLoss} crew points from exposure. Shelter time and reinforcement reduce this penalty.`
 if(/oxygen|air|life/i.test(q))return `The ${s.settings.air} air cycle produces ${r.oxygenMade} kg against 3.4 kg of demand. Oxygen storage is ${v.oxygen} kg. Normal operation and life-support priority support higher output.`
 if(/power|energy|solar|dust/i.test(q))return `At ${Math.round(e.sun*100)}% sunlight the array generates ${r.solar} kWh. Systems request ${r.demand} kWh. The battery carries ${v.power} kWh into this shift. Expansion improves later production at a cost of two spares.`
 if(/repair|wear|maintenance/i.test(q))return `Equipment condition is ${s.condition}%. A service uses one spare and restores up to 22 points. Condition affects array, recycler and air-system output.`
 if(/next|priority|situation|recommend|brief|focus/i.test(q))return `${e.title}. ${e.description} You have ${s.actions} crew actions and ${s.parts} spares. ${e.lesson}`
 return 'Offline guidance covers this sol’s advisory, power, oxygen, water, crops, radiation and repairs. Ask about one of those systems for a reading from your current plan.'
}
export function Advisor({s,online}:{s:State,online:boolean}){
 const [q,setQ]=useState(''),[chat,setChat]=useState<{q:string,a:string}[]>([]),[busy,setBusy]=useState(false)
 async function ask(input:string){const question=input.trim();if(!question||busy)return;setBusy(true);setQ('');let answer=localAnswer(s,question)
 if(online)try{const res=await fetch('/api/advisor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,state:s,history:chat.slice(-3)})});if(!res.ok)throw Error();answer=(await res.json()).answer}catch{answer='Offline guidance · '+answer}
 setChat(prev=>[...prev,{q:question,a:answer}]);setBusy(false)}
 return <><div className="advisor-intro"><Wave/><span className="mono">{online?'GEMINI CONNECTED':'OFFLINE GUIDANCE'}</span></div><p>{localAnswer(s,'situation')}</p>{chat.map((t,i)=><div className="chat" key={i}><strong>{t.q}</strong><p>{t.a}</p></div>)}<div className="suggestions">{['Power outlook','Water balance','Radiation risk'].map(x=><button disabled={busy} key={x} onClick={()=>ask(x)}>{x}<ChevronRight size={13}/></button>)}</div><form onSubmit={e=>{e.preventDefault();ask(q)}}><label className="sr" htmlFor="ask">Ask AURA about your colony</label><input id="ask" maxLength={500} value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about your colony…"/><button className="primary" disabled={busy||!q.trim()} aria-label="Send question"><Send size={17}/></button></form>{busy&&<p role="status">AURA is reviewing telemetry…</p>}</>
}

