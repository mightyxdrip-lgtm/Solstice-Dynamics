import { useState, type ReactNode } from 'react'
import { Activity, ArrowRight, Check, Monitor, X } from 'lucide-react'
import {
  advance, calculate, changeSettings, current, forecast, jobBlock, jobs,
  pct, performJob, resources, selectChoice, units, type Job, type Management,
  type Reserves, type State,
} from './engine'
import { Advisor, History, Log, Manual, colors, labels } from './ui'
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

  return <section className="terminal-inner" aria-label={name + ' terminal'}>
    <header className="term-head"><div><span><Monitor size={13}/>{code}</span><h2>{name}</h2></div>
      <button className="term-close" aria-label="Close terminal" onClick={onClose}><X size={19}/></button></header>
    <div className="term-body">
      {id === 'life' && <>
        <ReserveTable stocks={s.reserves}/>
        <Readings items={ [['Oxygen production', format(budget.oxygenMade) + ' kg/sol'], ['Crew oxygen use', '3.4 kg/sol']] }/>
        <Selector title="Air cycle" value={s.settings.air} options={ [['normal','Normal'],['eco','Conserve']] as const }
          onChange={value => adjust({air:value})} disabled={!active}/>
        <p>Conservation cuts the air plant’s load by 4 kWh and reduces oxygen output. Crew condition falls by two points per sol in this mode.</p>
        {submit('Complete life-support inspection', () => record('life','Life-support inspection recorded.'))}
      </>}
      {id === 'suit' && <>
        <Readings items={ [['Suit status', suited ? 'Equipped' : 'On rack']] }/>
        <p>Equip the EVA suit before cycling the habitat airlock. Monitor suit oxygen and power during surface work.</p>
        {submit(suited ? 'EVA suit equipped' : 'Equip EVA suit', () => record('suit','Suit sealed. Ready to cycle the airlock.'), suited || !inspectedLife)}
        {!inspectedLife && <p>Complete the life-support inspection to release the EVA suit.</p>}
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
        <p>Recovery depends on the filter, available power and shared equipment condition. Servicing equipment uses a spare and draws from the battery immediately.</p>
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
        <p>Extra water and lamp power increase the harvest from the mature crop. Check the battery and water reserves before increasing production.</p>
      </>}
      {id === 'shelter' && <>
        <Readings items={ [
          ['Radiation hazard', 'Level '+event.risk], ['Permanent shielding','Level '+s.shield+' / 4'],
          ['Projected exposure penalty',budget.radiationLoss+' crew points'],
        ] }/>
        <p>Additional shielding reduces exposure on later sols. During a particle alert, command can also schedule shelter time for the crew.</p>
        {workOrder('shield')}
      </>}
      {id === 'reports' && <>
        <nav aria-label="Report sections" className="term-tabs">{reportTabs.map(item =>
          <button key={item} aria-pressed={tab===item} onClick={()=>{setTab(item);setNotice('')}}>{item}</button>
        )}</nav>
        {tab === 'Watch' && (active ? <>
          <span className="term-advisory">Sol {s.sol} / {event.category}</span>
          <h3>{event.title}</h3><p>{event.description}</p>
          <div className="term-choices">{event.options.map((option,i) =>
            <button key={option.name} aria-pressed={s.choice === i} disabled={s.parts+(option.effect.parts||0)<0}
              onClick={() => {setS(selectChoice(s,i));setNotice('Response entered in the shift plan.')}}>
              <span><strong>{option.name}</strong><small>{option.detail}</small></span>{s.choice === i && <Check size={15}/>}
            </button>)}</div>
          {s.choice !== null && <p>{event.lesson}</p>}
          <ReserveTable stocks={s.reserves} projection={budget.result}/>
          {submit('Review shift results', () => record('review', 'Current shift projections reviewed.'))}
          {submit('Advance sol', finishShift, !canAdvance || s.choice===null)}
          {(!canAdvance || s.choice===null) && <p className="term-hint">
            {!canAdvance ? 'Complete the current mission objective to unlock shift handover.' : 'Choose an advisory response to commit this shift.'}
          </p>}
        </> : <><h3>{s.status==='success'?'Seven-sol mission complete':'Mission ended'}</h3><p>{s.reason}</p><History s={s}/></>)}
        {tab === 'Supplies' && <>{supplyInfo}{workOrder('repair')}{workOrder('survey')}{s.investigated && <p>{forecast(s)}</p>}</>}
        {tab === 'History' && <History s={s}/>}
        {tab === 'Log' && <Log s={s}/>}
        {tab === 'Manual' && <Manual/>}
        {tab === 'AURA' && <Advisor s={s} online={offlineOnline}/>}
      </>}
    </div>
    <footer className="term-foot" role="status" aria-live="polite"><Activity size={14}/>{notice || 'Connected · Sol ' + String(s.sol).padStart(2,'0')}</footer>
  </section>
}
