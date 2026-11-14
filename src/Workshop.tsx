import {calculate,type State} from './engine'
import {status} from './tasks'
import {stationNames} from './navigation'
import {Science} from './science'
import './workshop.css'

export function Workshop({s,id,close}:{s:State;id:string;close:()=>void}){
 const mission=status(s),f=s.fieldwork!,b=calculate(s)
 const result=s.sol===1?'Generation rose from '+calculate({...s,fieldwork:{...f,solar:'fault'}}).solar+' to '+b.solar+' kWh/sol. Dispatch priority: '+s.settings.priority+'.'
  :s.sol===2?'Recovery verified. '+b.recovered+' L/sol returned to the loop.'
  :s.sol===3?'Stable crop cycle. Projected yield: '+b.harvest+' rations.'
  :s.sol===4?'All four crew have a powered shelter berth.':'Equipment passed its field checks.'
 return <section className="workbench"><header><div><small>ARES FIELD SYSTEMS　/　SOL {String(s.sol).padStart(2,'0')}</small><h2>{stationNames[id]}</h2></div><button aria-label="Close instrument" onClick={close}>×</button></header>
 <div className="bench-body"><div className="bench-title"><i/>{mission.title}<b>{mission.step} / {mission.total}</b></div>
 {mission.complete?<><h3>Mission complete</h3><p>{result}</p><Science sol={s.sol}/></>:<><h3>{mission.tip}</h3><p>Next station · {stationNames[mission.station]}</p></>}</div>
 <footer><small>LOCAL EQUIPMENT LINK</small><button onClick={close}>Return to field ↗</button></footer></section>
}

