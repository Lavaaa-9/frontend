import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiClient, ApiError } from '../src/api/client.js'
import { RegistrationKey, validateDemographics } from '../src/validation.js'

const actor={id:'TEST-STAFF',email:'staff@example.invalid',display_name:'Sample Staff',role:'reception',active:true,version:1,facility_ids:['TEST-FACILITY'],permissions:['patients.read'],mfa_verified:false}
const tokens=(access_token='A')=>({access_token,token_type:'Bearer',expires_in:900,user:actor})
const json=(body:unknown,status=200)=>Response.json(body,{status})
const denied=(status=401)=>json({error:{code:'unauthorized',message:'Sign in again',fields:{}}},status)
const authorization=(init?:RequestInit)=>new Headers(init?.headers).get('Authorization')
test('web login sends cookie credentials and keeps the bearer out of JSON request bodies',async()=>{
  const calls:{url:string;init?:RequestInit}[]=[]
  const client=new ApiClient('/api/v1',async(url,init)=>{calls.push({url,init});return json(url.endsWith('/auth/login')?tokens():actor)})
  assert.deepEqual(await client.login(actor.email,'invented-test-password'),actor)
  assert.equal(calls[0].init?.credentials,'include');assert.equal(JSON.parse(String(calls[0].init?.body)).client_type,'web')
  assert.equal(authorization(calls[1].init),'Bearer A');assert.ok(!String(calls[0].init?.body).includes('refresh_token'))
})
test('MFA challenge cannot access records until verification returns tokens and an active actor',async()=>{
  const paths:string[]=[]
  const client=new ApiClient('/api',async(url)=>{paths.push(url);return json(url.endsWith('/auth/login')?{mfa_required:true,challenge_token:'TEST-CHALLENGE',expires_in:300}:url.endsWith('/auth/mfa/verify')?tokens():actor)})
  assert.ok('mfa_required' in await client.login(actor.email,'invented'))
  await assert.rejects(client.request('/staff/patients'),ApiError);assert.equal(paths.length,1)
  assert.deepEqual(await client.verify('TEST-CHALLENGE',{code:'123456'}),actor)
})
test('duplicate restoration and concurrent unauthorized requests share one refresh rotation',async()=>{
  let rotations=0
  const client=new ApiClient('/api',async(url,init)=>{
    if(url.endsWith('/auth/refresh')){rotations++;await new Promise(resolve=>setTimeout(resolve,5));return json(tokens(String(rotations)))}
    if(url.endsWith('/auth/me'))return json(actor)
    if(authorization(init)==='Bearer 1')return denied()
    return json({items:[]})
  })
  await Promise.all([client.restore(),client.restore()]);assert.equal(rotations,1)
  await Promise.all([client.request('/staff/patients'),client.request('/staff/facilities')]);assert.equal(rotations,2)
})
test('an ambiguous refresh failure is not retried and ends the local session',async()=>{
  let rotations=0,lost=0
  const client=new ApiClient('/api',async()=>{rotations++;throw new TypeError('offline')});client.onSessionLost=()=>lost++
  await assert.rejects(client.restore(),/could not be reached/);assert.equal(rotations,1);assert.equal(lost,1)
  await assert.rejects(client.request('/staff/patients'),/Sign in/);assert.equal(rotations,1)
})
test('a second unauthorized response clears credentials instead of looping',async()=>{
  let lost=0,requests=0
  const client=new ApiClient('/api',async url=>url.endsWith('/auth/login')||url.endsWith('/auth/refresh')?json(tokens()):url.endsWith('/auth/me')?json(actor):(requests++,denied()))
  client.onSessionLost=()=>lost++;await client.login(actor.email,'invented')
  await assert.rejects(client.request('/staff/patients'),ApiError);assert.equal(requests,2);assert.equal(lost,1)
})
test('inactive account responses cannot enter a workspace',async()=>{
  const client=new ApiClient('/api',async url=>json(url.endsWith('/auth/login')?tokens():{...actor,active:false}))
  await assert.rejects(client.login(actor.email,'invented'),/account is unavailable/)
  await assert.rejects(client.request('/staff/patients'),/Sign in/)
})
test('logout drops credentials even when server revocation fails',async()=>{
  const client=new ApiClient('/api',async url=>url.endsWith('/auth/logout')?denied(503):json(url.endsWith('/auth/login')?tokens():actor))
  await client.login(actor.email,'invented');await assert.rejects(client.logout(),ApiError)
  await assert.rejects(client.request('/staff/patients'),/Sign in/)
})
test('responses from a cleared session are not delivered to the caller',async()=>{
  let finish!:(value:Response)=>void
  const client=new ApiClient('/api',async url=>url.endsWith('/staff/patients')?new Promise<Response>(resolve=>{finish=resolve}):json(url.endsWith('/auth/login')?tokens():actor))
  await client.login(actor.email,'invented');const request=client.request('/staff/patients');client.clear();finish(json({items:[]}));await assert.rejects(request,/session changed/)
})
test('registration retry key is stable for unchanged payloads and changes with the payload',()=>{
  let count=0;const key=new RegistrationKey(()=>`test-key-${++count}`)
  assert.equal(key.forPayload({name:'Sample'}),key.forPayload({name:'Sample'}));assert.notEqual(key.forPayload({name:'Other'}),'test-key-1')
})
test('birth precision validates year and does not require a fabricated date for unknown birth details',()=>{
  const value={given_name:'Sample',family_name:'Person',phone:'',address:'',birth_precision:'unknown' as const}
  assert.equal(validateDemographics(value,'2026-11-18'),'')
  assert.match(validateDemographics({...value,birth_precision:'year',birth_year:2027},'2026-11-18'),/birth year/)
  assert.ok(validateDemographics({...value,birth_precision:'exact',birth_date:'2026-02-30'},'2026-11-18'))
})
