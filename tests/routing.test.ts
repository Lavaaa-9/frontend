import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRoute } from '../src/app/routing.js'
test('hash routes preserve direct links and open the terminal landing page by default',()=>{
  assert.deepEqual(parseRoute('#/patients/SP-00021'),{section:'patients',detail:'SP-00021'})
  assert.deepEqual(parseRoute(''),{section:'terminals',detail:''})
  assert.deepEqual(parseRoute('#/'),{section:'terminals',detail:''})
  assert.deepEqual(parseRoute('#/dashboard'),{section:'dashboard',detail:''})
})
test('unknown routes survive parsing for the 404 page and malformed encoding cannot crash navigation',()=>{assert.equal(parseRoute('#/unknown').section,'unknown');assert.equal(parseRoute('#/patients/%E0%A4%A').detail,'')})
