import { useState, type ReactNode } from 'react'
import { Activity, ArrowRight, Check, Monitor, X, BatteryCharging, House, Wrench, Droplets, Sun, Leaf, ShieldCheck, Footprints, Circle, Bandage, Apple, CloudFog, Shirt, Play, Rocket } from 'lucide-react'
import {
  advance, calculate, changeSettings, current, forecast, jobBlock, jobs,
  pct, performJob, resources, selectChoice, units, type Job, type Management,
  type Reserves, type State,
} from './engine'
import { Advisor, History, Log, Manual, colors, labels } from './ui'
import {Science} from './science'
import {StationIcon} from './visualGuidance'
import {status} from './tasks'
import './terminal.css'

export type TerminalEvent = 'life' | 'suit' | 'solar' | 'allocated' | 'review' | 'advance'

export interface TerminalProps {
  id: string
  s: State
  setS: (state: State) => void
  onClose: () => void
  onRecord: (event: TerminalEvent) => void
  offlineOnline: boolean
  canAdvance: boolean
  suited: boolean
  inspectedLife: boolean
}

const stations: Record<string, [string, string]> = {
  life: ['HAB / ECLSS', 'Life support'],
  suit: ['HAB / EVA', 'Suit station'],
  solar: ['PWR / ARRAY', 'Solar control'],
  green: ['AGR / CULTIVATION', 'Greenhouse controls'],
  water: ['WTR / RECOVERY', 'Water processor'],
  shelter: ['SHL / PROTECTION', 'Radiation shelter'],
  reports: ['HAB / COMMAND', 'Shift reports'],
}

const priorities = [
  ['balanced', 'Balanced'], ['life', 'Life support'], ['crops', 'Greenhouse'],
] as const
const irrigation = [
  ['low', 'Low · 2 L'], ['standard', 'Standard · 4 L'], ['high', 'High · 7 L'],
] as const
const reportTabs = ['Watch', 'Supplies', 'History', 'Log', 'Manual', 'AURA'] as const
const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })

function Readings({ items }: { items: [string, ReactNode][] }) {
  return <dl className="term-readings">{items.map(([name, value]) =>
    <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
  )}</dl>
}

function ReserveTable({ stocks, projection }: { stocks: Reserves, projection?: Reserves }) {
  return <table className="term-reserves">
    <caption>{projection ? 'Shift forecast' : 'Colony reserves'}</caption>
    <thead><tr><th scope="col">System</th><th scope="col">Current</th>
      <th scope="col">{projection ? 'End of sol' : 'Capacity'}</th></tr></thead>
    <tbody>{resources.map(key => <tr key={key}>
      <th scope="row"><i style={{ background: colors[key] }}/>{labels[key]}</th>
      <td>{format(stocks[key])} {units[key]}</td>
      <td>{projection ? format(projection[key]) + ' ' + units[key] : pct(stocks, key) + '%'}</td>
    </tr>)}</tbody>
  </table>
}

function Selector<T extends string>({ title, options, value, onChange, disabled }: {
  title: string, options: readonly (readonly [T,string])[], value: T,
  onChange: (value: T) => void, disabled?: boolean,
}) {
  return <fieldset className="term-selector" disabled={disabled}><legend>{title}</legend>
    <div>{options.map(([key,label]) => <button key={key} aria-pressed={value === key}
      onClick={() => onChange(key)}>{label}</button>)}</div>
  </fieldset>
}

export function Terminal(props: TerminalProps) {
  return <Station key={props.id} {...props}/>
}

function Station({ id, s, setS, onClose, onRecord, offlineOnline, canAdvance, suited, inspectedLife }: TerminalProps) {
  const [tab, setTab] = useState<typeof reportTabs[number]>('Watch')
  const [priority, setPriority] = useState(s.settings.priority)
  const [notice, setNotice] = useState('')
  const event = current(s)
  const budget = calculate(s)
  const active = s.status === 'active'
  const [code,name] = stations[id] ?? ['HAB / COMMAND', 'Terminal']

  function record(event: TerminalEvent, message: string) {
    onRecord(event)
    setNotice(message)
  }

  function adjust(patch: Partial<Management>) {
    setS(changeSettings(s, patch))
    setNotice('Operating settings updated.')
  }

  function workOrder(key: Job) {
    const job = jobs[key]
    const block = jobBlock(s,key)
    return <button className="term-order" disabled={Boolean(block)} onClick={() => {
      const next = performJob(s, key)
      if (next === s) return
      setS(next)
      setNotice(key === 'survey' ? forecast(next) : job.name + ' complete. Battery now holds ' + format(next.reserves.power) + ' kWh.')
    }}>
      <span><strong>{job.name}</strong><small>{job.detail}</small>
        <em>{block || '1 crew action · ' + job.parts + ' spares · ' + job.energy + ' kWh'}</em></span><ArrowRight size={16}/>
    </button>
  }

  function submit(text: string, fn: () => void, disabled = false) {
    return <button className="term-submit" disabled={disabled} onClick={fn}>{text}<ArrowRight size={16}/></button>
  }

  function applyPower() {
    setS(changeSettings(s, { priority }))
    record('allocated', 'Power routed. Current shift demand is ' + format(calculate(changeSettings(s, { priority })).demand) + ' kWh.')
  }

  function finishShift() {
    if (!canAdvance || s.choice === null || !active) return
    const next = advance(s)
    if (next === s) return
    setS(next)
    onRecord('advance')
    setNotice('Sol ' + s.sol + ' recorded.')
  }

  const irrigationControl = <Selector title="Crop irrigation per sol" value={s.settings.irrigation}
    options={irrigation} disabled={!active} onChange={value => adjust({ irrigation:value })}/>
  const supplyInfo = <Readings items={ [['Spare parts', s.parts], ['Crew actions left this sol', s.actions]] }/>

  if(id==='suit')return <section className="field-card" aria-label="Suit station">
    <button className="corner-close" aria-label="Close terminal" onClick={onClose}><X/></button>
    <button className="single-action" aria-label={suited?'Return to field':'Equip EVA suit'} onClick={()=>{if(!suited)onRecord('suit');onClose()}}>
     <Shirt size={68}/><b>{suited?'Go':'Suit up'}</b><ArrowRight size={26}/>
    </button>
  </section>
  const job=status(s)
  if(id==='reports'&&s.sol===7&&canAdvance&&active){
   const storm=current(s)
   function decide(choice:0|1){
    const selected=selectChoice(s,choice),result=advance(selected)
    if(result===selected)return
    setS(result);onRecord('advance')
   }
   return <section className="storm-card" aria-label="Final sandstorm decision">
    <CloudFog size={54} aria-hidden="true"/><h2>{storm.title}</h2>
    <p>{storm.description}</p>
    <div className="storm-choices"><button onClick={()=>decide(0)}><Rocket size={30}/>{storm.options[0].name}</button>
     <button onClick={()=>decide(1)}><Footprints size={30}/>{storm.options[1].name}</button></div>
   </section>
  }
  const choices=[
   [[BatteryCharging,'Save power'],[House,'Warm cabin']],
   [[Wrench,'New filter'],[Droplets,'Wash filter']],
   [[Sun,'Light plants'],[Leaf,'Trim plants']],
   [[ShieldCheck,'Shelter'],[Footprints,'Work outside']],
   [[Circle,'New seal'],[Bandage,'Patch seal']],
   [[Droplets,'Get water'],[Apple,'Get food']],
   [[Rocket,current(s).options[0].name],[Footprints,current(s).options[1].name]]
  ] as const
  const options=choices[s.sol-1]||choices[0]
  const primary=id==='reports'&&canAdvance?<div className="plan-panel">
    <h2>Pick a plan</h2><div className="plan-pair">{event.options.map((option,i)=>{
     const [Icon,label]=options[i];return <button key={option.name} aria-label={option.name} aria-pressed={s.choice===i}
      disabled={s.parts+(option.effect.parts||0)<0} onClick={()=>setS(selectChoice(s,i))}><Icon size={34}/>{label}{s.choice===i&&<Check size={17}/>}</button>
    })}</div>
    <button className="day-next" aria-label="Advance sol" onClick={finishShift} disabled={s.choice===null}><Play size={18}/>{s.sol===7?'Finish':'Next day'}</button>
   </div>:<button className="go-task" aria-label={'Return to field for '+job.station} onClick={onClose}><StationIcon id={suited?job.station:'suit'} size={40}/><span>Go to task</span><ArrowRight/></button>

  return <section className="terminal-inner" aria-label={name + ' terminal'}>
    <header className="term-head"><div><span><Monitor size={13}/>{code}</span><h2>{name}</h2></div>
      <button className="term-close" aria-label="Close terminal" onClick={onClose}><X size={19}/></button></header>
    <div className="term-body">
      {primary}
      <details className="extra-instruments"><summary>Details</summary>
      {id === 'life' && <>
        <ReserveTable stocks={s.reserves}/>
        <Readings items={ [['Oxygen production', format(budget.oxygenMade) + ' kg/sol'], ['Crew oxygen use', '3.4 kg/sol']] }/>
        <Selector title="Air cycle" value={s.settings.air} options={ [['normal','Normal'],['eco','Conserve']] as const }
          onChange={value => adjust({air:value})} disabled={!active}/>
        <details><summary>Help</summary><p>Conservation cuts the air plant’s load by 4 kWh and reduces oxygen output. Crew condition falls by two points per sol in this mode.</p></details>
        {submit('Complete life-support inspection', () => record('life','Life-support inspection recorded.'))}
      </>}
      {id === 'solar' && <>
        <Readings items={ [
          ['Surface conditions', event.weather], ['Available sunlight', Math.round(event.sun*100)+'%'],
          ['Clear-sky capacity', (34+8*s.solar)+' kWh/sol'], ['Actual generation',format(budget.solar)+' kWh/sol'],
          ['Stored battery energy',format(s.reserves.power)+' kWh'],
        ] }/>
        {submit('Diagnose array', () => record('solar', 'Diagnostic complete. Available sunlight and ' + s.condition + '% equipment condition yield ' + format(budget.solar) + ' kWh this sol.'))}
        <Selector title="Power distribution" options={priorities} value={priority} onChange={setPriority} disabled={!active}/>
        <Readings items={ [['Planned demand',format(calculate(changeSettings(s,{priority})).demand)+' kWh/sol']] }/>
        {submit('Apply power allocation', applyPower, !active)}
        {workOrder('array')}
      </>}
      {id === 'water' && <>
        <Readings items={ [
          ['Water reserve',format(s.reserves.water)+' L'],['Filter recovery coefficient', Math.round(budget.recycled*100)+'%'],
          ['Recovered this sol',format(budget.recovered)+' L'], ['Equipment condition',s.condition+'%'],
        ] }/>
        <details><summary>Help</summary><p>Recovery depends on the filter, available power and shared equipment condition. Servicing equipment uses a spare and draws from the battery immediately.</p></details>
        {workOrder('repair')}{irrigationControl}
      </>}
      {id === 'green' && <>
        <Readings items={ [
          ['Stored food',format(s.reserves.food)+' rations'], ['Projected harvest',format(budget.harvest)+' rations/sol'],
          ['Crew consumption','4 rations/sol'], ['Projected water reserve',format(budget.result.water)+' L'],
        ] }/>
        {irrigationControl}
        <Selector title="Power distribution" options={priorities} value={s.settings.priority}
          disabled={!active} onChange={value => adjust({priority:value})}/>
        <details><summary>Help</summary><p>Extra water and lamp power increase the harvest from the mature crop. Check the battery and water reserves before increasing production.</p></details>
      </>}
      {id === 'shelter' && <>
        <Readings items={ [
          ['Radiation hazard', 'Level '+event.risk], ['Permanent shielding','Level '+s.shield+' / 4'],
          ['Projected exposure penalty',budget.radiationLoss+' crew points'],
        ] }/>
        <details><summary>Help</summary><p>Additional shielding reduces exposure on later sols. During a particle alert, command can also schedule shelter time for the crew.</p></details>
        {workOrder('shield')}
      </>}
      {id === 'reports' && <>
        <nav aria-label="Report sections" className="term-tabs">{reportTabs.map(item =>
          <button key={item} aria-pressed={tab===item} onClick={()=>{setTab(item);setNotice('')}}>{item}</button>
        )}</nav>
        {tab === 'Watch' && (active ? <>
          <span className="term-advisory">Sol {s.sol} / {event.category}</span>
          <h3>{event.title}</h3><details><summary>Help</summary><p>{event.description}</p><p>{event.lesson}</p></details>
          <div className="term-choices">{event.options.map((option,i) =>
            <button key={option.name} aria-pressed={s.choice === i} disabled={s.parts+(option.effect.parts||0)<0}
              onClick={() => {setS(selectChoice(s,i));setNotice('Response entered in the shift plan.')}}>
              <span><strong>{option.name}</strong><small>{Object.entries(option.effect).map(([key,value])=>(value!>0?'+':'')+value+' '+({power:'kWh',water:'L',oxygen:'kg O₂',food:'food',crew:'crew',parts:'spare',recycled:'recovery',condition:'repair',protection:'shield',harvest:'food'} as Record<string,string>)[key]).join(' · ')}</small></span>{s.choice === i && <Check size={15}/>}
            </button>)}</div>

          <ReserveTable stocks={s.reserves} projection={budget.result}/>

          {submit('Advance sol', finishShift, !canAdvance || s.choice===null)}
          {(!canAdvance || s.choice===null) && <p className="term-hint">
            {!canAdvance ? 'Finish the field task.' : 'Choose a plan.'}
          </p>}
        </> : <><h3>{s.status==='success'?'Seven-sol mission complete':'Mission ended'}</h3><p>{s.reason}</p><History s={s}/></>)}
        {tab === 'Supplies' && <>{supplyInfo}{workOrder('repair')}{workOrder('survey')}{s.investigated && <p>{forecast(s)}</p>}</>}
        {tab === 'History' && <History s={s}/>}
        {tab === 'Log' && <><Log s={s}/>{Array.from({length:s.done+(canAdvance&&active?1:0)},(_,i)=><details key={i}><summary>Sol {i+1} · field science</summary><Science sol={i+1}/></details>)}</>}
        {tab === 'Manual' && <Manual/>}
        {tab === 'AURA' && <Advisor s={s} online={offlineOnline}/>}
      </>}
      </details>
    </div>
    {notice&&<footer className="term-foot" role="status" aria-live="polite"><Activity size={14}/>{notice}</footer>}
  </section>
}
