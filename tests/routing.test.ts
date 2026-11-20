import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRoute } from '../src/app/routing.js'
import { findModule, mayOpenModule, modules } from '../src/app/modules.js'
test('hash routes preserve direct links and open the dashboard by default',()=>{
  assert.deepEqual(parseRoute('#/patients/SP-00021'),{section:'patients',detail:'SP-00021'})
  assert.deepEqual(parseRoute(''),{section:'dashboard',detail:''})
  assert.deepEqual(parseRoute('#/'),{section:'dashboard',detail:''})
  assert.deepEqual(parseRoute('#/dashboard'),{section:'dashboard',detail:''})
})
test('protected module navigation requires the permission returned by the server',()=>{
  const patients=findModule('patients')!
  assert.equal(mayOpenModule(patients,[]),false)
  assert.equal(mayOpenModule(patients,['patients.write']),false)
  assert.equal(mayOpenModule(patients,['patients.read']),true)
})
test('unknown routes survive parsing for the 404 page and malformed encoding cannot crash navigation',()=>{assert.equal(parseRoute('#/unknown').section,'unknown');assert.equal(parseRoute('#/patients/%E0%A4%A').detail,'')})
test('requested module routes exist without claiming unapproved clinical permissions',()=>{
  for(const id of ['dashboard','patients','reception','appointments','queue','triage','consultations','laboratory','pharmacy','billing','telemedicine','reports','team','settings','account']) assert.ok(findModule(id),id)
  assert.equal(new Set(modules.map(module=>module.id)).size,modules.length)
  assert.equal(findModule('appointments')?.connected,undefined)
  assert.equal(findModule('patients')?.permission,'patients.read')
})
