import test from 'node:test'
import assert from 'node:assert/strict'
import {gameKey} from '../src/input.ts'

test('embedded key-only events support interaction, movement, tools and release',()=>{
 for(const [key,expected] of [['e','KeyE'],['w','KeyW'],['a','KeyA'],['s','KeyS'],['d','KeyD'],['q','KeyQ'],['r','KeyR']]){
  assert.equal(gameKey({key,code:''}),expected)
  assert.equal(gameKey({key:key.toUpperCase(),code:'Unidentified'}),expected)
  assert.equal(gameKey({key}),expected)
 }
 // Shift may be released before W. Both event forms must remove the same held key.
 assert.equal(gameKey({key:'W'}),gameKey({key:'w'}))
})

test('recognized physical codes take priority over keyboard-layout characters',()=>{
 assert.equal(gameKey({code:'KeyW',key:'z',keyCode:90}),'KeyW')
 assert.equal(gameKey({code:'KeyE',key:'é'}),'KeyE')
 assert.equal(gameKey({code:'ShiftRight',key:'Shift',location:1}),'ShiftRight')
 assert.equal(gameKey({code:'NumpadEnter',key:'Enter',location:3}),'Enter')
})

test('key names and historical aliases resolve to the same gameplay actions',()=>{
 for(const [expected,names] of [
  ['ArrowLeft',['ArrowLeft','Left']],['ArrowRight',['ArrowRight','Right']],
  ['ArrowUp',['ArrowUp','Up']],['ArrowDown',['ArrowDown','Down']],
  ['Escape',['Escape','Esc']],['Space',[' ','Space','Spacebar']],
  ['Enter',['Enter','Return','NumpadEnter']]
 ])for(const key of names)assert.equal(gameKey({key}),expected)
 assert.equal(gameKey({key:'Shift',location:2}),'ShiftRight')
 assert.equal(gameKey({key:'Shift',location:1}),'ShiftLeft')
 assert.equal(gameKey({key:'Shift'}),'ShiftLeft')
})

test('legacy-only embedded events retain movement, interaction and modifier bindings',()=>{
 for(const [keyCode,expected] of [[87,'KeyW'],[65,'KeyA'],[83,'KeyS'],[68,'KeyD'],[69,'KeyE'],[81,'KeyQ'],[82,'KeyR'],[13,'Enter'],[27,'Escape'],[32,'Space'],[37,'ArrowLeft'],[38,'ArrowUp'],[39,'ArrowRight'],[40,'ArrowDown']]){
  assert.equal(gameKey({keyCode}),expected)
  assert.equal(gameKey({code:'Unidentified',key:'Unidentified',keyCode}),expected)
 }
 assert.equal(gameKey({keyCode:16,location:2}),'ShiftRight')
 assert.equal(gameKey({keyCode:16,location:1}),'ShiftLeft')
})

test('unbound keys and text-composition events produce no gameplay action',()=>{
 for(const event of [{},{code:'F1',key:'F1',keyCode:112},{key:'x',keyCode:88},{key:'Tab',keyCode:9},{key:'Dead',keyCode:69},{key:'Process',keyCode:69},{key:'Unidentified',keyCode:229},{key:'constructor'},{key:'__proto__'}])assert.equal(gameKey(event),'')
})
