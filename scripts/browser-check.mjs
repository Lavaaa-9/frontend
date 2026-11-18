// Dependency-free smoke checks against the local preview using installed Chrome/Edge.
// Run: node scripts/browser-check.mjs [http://127.0.0.1:5173]
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const url = process.argv[2] ?? 'http://127.0.0.1:5173'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Only a local synthetic-data preview may be tested')
const browserPath = process.env.SPARTIAL_BROWSER ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
assert.ok(browserPath, 'Install Chrome/Edge separately or set SPARTIAL_BROWSER to an existing browser executable')
assert.equal((await fetch(url)).status, 200, 'Local Vite preview responds')
const profileParent = path.resolve('.qa-browser')
mkdirSync(profileParent, { recursive: true })
const profile = mkdtempSync(path.join(profileParent, 'smoke-'))
const browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let page, control
const checks = []
const errors = []
const externalRequests = new Set()

async function waitFor(check, label, timeout = 12000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await check()) return
    await delay(60)
  }
  throw new Error(`Timed out: ${label}`)
}
async function connect(endpoint) {
  const socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map()
  const handlers = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const request = pending.get(message.id)
      if (!request) return
      clearTimeout(request.timer)
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    } else handlers.get(message.method)?.(message.params)
  })
  return {
    call(method, params = {}) { return new Promise((resolve, reject) => {
      const requestId = ++id
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)) }, 15000)
      pending.set(requestId, { resolve, reject, timer })
      socket.send(JSON.stringify({ id: requestId, method, params }))
    }) },
    on(method, handler) { handlers.set(method, handler) },
    close() { socket.close() },
  }
}
async function evaluate(expression) {
  const result = await page.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
async function expect(expression, label) {
  assert.ok(await evaluate(expression), label)
  checks.push(label)
}
async function click(selector, text) {
  const point = await evaluate(`(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.getClientRects().length && (${text === undefined ? 'true' : `el.textContent.trim().startsWith(${JSON.stringify(text)})`}))
    if (!target) throw new Error('Missing target: ' + ${JSON.stringify(`${selector} ${text ?? ''}`)})
    target.scrollIntoView({block:'center'})
    const rect = target.getBoundingClientRect()
    return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}
  })()`)
  await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  await delay(80)
}
async function fill(selector, value) {
  await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)})
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)})
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}))
  })()`)
  await delay(60)
}
async function key(key, modifiers = 0) {
  const code = key === 'Tab' ? 9 : key === 'Escape' ? 27 : 13
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, modifiers })
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, modifiers })
  await delay(60)
}
async function viewport(width, height = 1000) {
  await page.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  await delay(150)
}
async function navigate(title) {
  if (await evaluate('innerWidth <= 760')) await click('[aria-label="Open navigation"]')
  await click('nav button', title)
}
async function screenshot(name) {
  await evaluate('window.scrollTo(0,0)')
  await delay(100)
  const metrics = await page.call('Page.getLayoutMetrics')
  const clip = await evaluate(`({x:0,y:0,width:innerWidth,height:document.querySelector('dialog[open]') ? innerHeight : ${Math.ceil(metrics.cssContentSize.height)},scale:1})`)
  const result = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
  writeFileSync(path.resolve('docs/screenshots', `${name}.png`), Buffer.from(result.data, 'base64'))
}
async function role(value) { await fill('[aria-label="Preview staff role"]', value) }
async function screenState(value) { await fill('.state-preview-control select', value) }

try {
  await waitFor(() => existsSync(path.join(profile, 'DevToolsActivePort')), 'browser debugging endpoint')
  const [port, browserEndpoint] = readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/)
  control = await connect(`ws://127.0.0.1:${port}${browserEndpoint}`)
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  page = await connect(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await page.call('Runtime.enable')
  await page.call('Network.enable')
  page.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text))
  page.on('Runtime.consoleAPICalled', event => { if (event.type === 'error') errors.push(event.args.map(arg=>arg.value ?? arg.description).join(' ')) })
  page.on('Network.requestWillBeSent', event => {
    if (/^https?:/.test(event.request.url) && !['localhost', '127.0.0.1'].includes(new URL(event.request.url).hostname)) externalRequests.add(event.request.url)
  })
  await viewport(1440)
  await page.call('Page.navigate', { url })
  await waitFor(() => evaluate('!!document.querySelector("#preview-role")'), 'login design')
  mkdirSync('docs/screenshots', { recursive: true })
  await screenshot('staff-login-desktop')
  await viewport(390, 844)
  await expect('document.documentElement.scrollWidth <= innerWidth', 'Login fits a phone viewport')
  await screenshot('staff-login-mobile')
  await viewport(1440)
  await click('.login-submit')
  await screenshot('dashboard-desktop')
  await navigate('Patients')
  await click('.main-heading button', 'Register patient')
  await expect('document.activeElement.id === "patient-name"', 'Registration dialog initially focuses the name field')
  await evaluate('document.querySelector("dialog button").focus()')
  await key('Tab', 8)
  await expect('document.activeElement.textContent.includes("Add demo patient")', 'Shift+Tab wraps to the final dialog action')
  await key('Tab')
  await expect('document.activeElement.getAttribute("aria-label") === "Close Register patient"', 'Tab wraps to the first dialog action')
  await key('Escape')
  await expect('!document.querySelector("dialog") && document.activeElement.textContent.includes("Register patient")', 'Escape dismisses the dialog and restores trigger focus')
  await click('.main-heading button', 'Register patient')
  await click('dialog button[type="submit"]')
  await expect('document.querySelectorAll("[aria-invalid=true]").length === 2', 'Required name and age errors are associated with their fields')
  await fill('#patient-name', 'Amina M.')
  await fill('#patient-age', '32')
  await click('dialog button[type="submit"]')
  await expect('document.querySelector("#patient-name-error").textContent.includes("already exists")', 'Duplicate patient name is flagged without creating a record')
  await fill('#patient-name', 'Sample Review Person')
  await fill('#patient-age', '0')
  await click('dialog button[type="submit"]')
  await expect('document.querySelectorAll("tbody tr").length === 7', 'A newborn sample patient can be registered in memory')
  await fill('[aria-label="Search patients"]', 'no-such-sample')
  await expect('document.body.textContent.includes("No matching patients")', 'Patient search has a no-results state')
  await click('button', 'Clear filters')
  await screenshot('patients-desktop')
  await click('[aria-label="View patient Sample Review Person"]')
  await expect('!!document.querySelector("dialog.patient-drawer[open]")', 'Patient preview uses a native modal drawer')
  await click('dialog button', 'Book demo appointment')
  await expect('document.querySelector("#app-patient").value === "SP-00031"', 'Booking from a patient preview preserves the patient identity')
  await click('dialog button[type="submit"]')
  await expect('document.querySelectorAll("tbody tr").length === 6', 'A sample appointment is added to the schedule')
  await click('.main-heading button', 'New appointment')
  await fill('#app-patient', 'SP-00031')
  await click('dialog button[type="submit"]')
  await expect('document.querySelector("#app-time-error").textContent.includes("already has")', 'Duplicate patient date/time is rejected in the booking form')
  await key('Escape')
  await screenshot('appointments-desktop')
  await click('[aria-label="Cancel appointment for Sample Review Person"]')
  await click('dialog button', 'Keep unchanged')
  await expect('[...document.querySelectorAll("tbody tr")].find(tr=>tr.textContent.includes("Sample Review Person")).textContent.includes("Check in")', 'Dismissing cancellation leaves the appointment unchanged')
  await click('[aria-label="Check in Sample Review Person"]')
  await expect('document.querySelectorAll("tbody tr").length === 5 && document.body.textContent.includes("VIS-")', 'Check-in creates a linked synthetic queue visit')
  await expect('![...document.querySelectorAll(".table-action")].some(el=>el.textContent.includes("To Triage"))', 'Reception does not see clinical transition actions')
  await navigate('Appointments')
  await click('.main-heading button', 'New appointment')
  await fill('#app-patient', 'SP-00031')
  await fill('#app-time', '10:30')
  await click('dialog button[type="submit"]')
  await click('[aria-label="Check in Sample Review Person"]')
  await expect('document.querySelector(".toast").textContent.includes("already has an active visit")', 'A second check-in is rejected while the patient has an active visit')
  await navigate('Patient Queue')
  await expect('document.querySelectorAll("tbody tr").length === 5', 'Rejected check-in does not create another visit')
  await role('Nurse')
  await navigate('Patient Queue')
  await click('[aria-label="Move Sample Review Person to Triage"]')
  await screenshot('queue-confirmation-desktop')
  await click('dialog button', 'Move to Triage')
  await click('[aria-label="Move Sample Review Person to Consultation"]')
  await click('dialog button', 'Move to Consultation')
  await role('Doctor')
  await navigate('Patient Queue')
  await click('[aria-label="Move Sample Review Person to Completed"]')
  await click('dialog button', 'Move to Completed')
  await navigate('Appointments')
  await expect('[...document.querySelectorAll("tbody tr")].find(tr=>tr.textContent.includes("Sample Review Person")).textContent.includes("Completed")', 'Completing a linked visit updates its appointment status')
  await role('Reception')
  if (await evaluate('!!document.querySelector(".toast button")')) await click('[aria-label="Dismiss message"]')
  await navigate('Appointments')
  await click('[aria-label="Cancel appointment for Peter J."]')
  await click('dialog button', 'Cancel demo appointment')
  await expect('[...document.querySelectorAll("tbody tr")].find(tr=>tr.textContent.includes("Peter J.")).textContent.includes("Cancelled")', 'Confirmed cancellation changes the selected appointment')
  await navigate('Patients')
  for (const state of ['loading', 'empty', 'error', 'denied']) {
    await screenState(state)
    await expect(state === 'loading' ? '!!document.querySelector("[aria-busy=true]")' : '!!document.querySelector(".state-card")', `${state} screen design is reachable`)
    if (state === 'error') await screenshot('failure-state-desktop')
    if (state === 'denied') await screenshot('access-denied-desktop')
    await click('.state-card button')
    await expect('document.querySelectorAll("tbody tr").length === 7', `Returning from ${state} preserves in-memory records`)
  }
  await role('Cashier')
  await expect('![...document.querySelectorAll("button")].some(el=>el.textContent.includes("Register patient") || el.textContent.includes("Book appointment"))', 'Cashier dashboard hides registration and booking actions')
  await navigate('Patients')
  await click('[aria-label="View patient Amina M."]')
  await expect('!document.querySelector("dialog .button.primary")', 'Cashier patient drawer hides booking actions')
  await key('Escape')
  await role('Administrator')
  await navigate('Nurse Triage')
  await expect('document.body.textContent.includes("UI blueprint · Not implemented")', 'Clinical modules remain clearly labeled as design-only')
  await role('Reception')
  for (const width of [320, 390, 768, 1024, 1440]) {
    if (await evaluate('!!document.querySelector(".toast button")')) await click('[aria-label="Dismiss message"]')
    await viewport(width, width < 760 ? 844 : 1000)
    for (const title of ['Dashboard', 'Patients', 'Appointments', 'Patient Queue']) {
      await navigate(title)
      await expect('document.documentElement.scrollWidth <= innerWidth', `${title} has no page overflow at ${width}px`)
      if (width === 390) await screenshot(`${title.toLowerCase().replaceAll(' ', '-')}-mobile`)
    }
  }
  await viewport(390, 844)
  await click('[aria-label="Open navigation"]')
  await expect('!!document.querySelector("dialog.navigation-dialog[open]") && document.querySelector("dialog").contains(document.activeElement)', 'Mobile navigation is modal and receives focus')
  await screenshot('navigation-mobile')
  await key('Escape')
  await expect('!document.querySelector("dialog") && document.activeElement.getAttribute("aria-label") === "Open navigation"', 'Mobile navigation Escape restores menu-button focus')
  await viewport(1440)
  await navigate('Patients')
  await expect('[...document.querySelectorAll("input, select")].every(el=>el.getAttribute("aria-label") || el.labels?.length)', 'Visible form controls have programmatic labels')
  await expect('[...document.querySelectorAll("th")].every(el=>el.scope === "col")', 'Data table headers have explicit column scope')
  await page.call('Page.reload')
  await waitFor(() => evaluate('!!document.querySelector("#preview-role")'), 'reload returns to preview entry')
  await click('.login-submit')
  await navigate('Patients')
  await expect('document.querySelectorAll("tbody tr").length === 6', 'Reload resets the preview and discards created records')
  await navigate('Appointments')
  const appointmentDataExpression = '[...document.querySelectorAll("tbody tr")].map(tr=>[...tr.cells].slice(0,5).map(cell=>cell.textContent))'
  const appointmentsBeforeWalkIn = await evaluate(appointmentDataExpression)
  await navigate('Patient Queue')
  await fill('[aria-label="Filter queue stage"]', 'Completed')
  await click('.page-actions button', 'Add demo walk-in')
  await expect('document.activeElement.id === "walk-in-patient"', 'Walk-in dialog focuses the registered-patient field')
  await click('dialog button', 'Cancel')
  await expect('document.querySelectorAll("tbody tr").length === 1 && document.querySelector(".filter-select").value === "Completed"', 'Cancelling walk-in entry preserves the queue and current filter')
  await click('.page-actions button', 'Add demo walk-in')
  await click('dialog button[type="submit"]')
  await expect('document.activeElement.id === "walk-in-patient" && !!document.querySelector("#walk-in-patient-error")', 'A walk-in requires a registered sample patient and focuses its error')
  await fill('#walk-in-patient', 'SP-00021')
  await click('dialog button[type="submit"]')
  await expect('document.querySelector("#walk-in-patient-error").textContent.includes("VIS-1001")', 'Walk-in duplicate warning identifies the existing active visit')
  await screenshot('walk-in-conflict-desktop')
  await click('dialog button', 'Review existing visit in queue')
  await expect('document.querySelectorAll("tbody tr").length === 4', 'Reviewing an existing visit clears filters without creating another entry')
  await fill('[aria-label="Filter queue stage"]', 'Completed')
  await click('.page-actions button', 'Add demo walk-in')
  await fill('#walk-in-patient', 'SP-00024')
  await fill('#walk-in-service', 'Health screening')
  await screenshot('walk-in-form-desktop')
  await viewport(390, 844)
  await expect('document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth && document.documentElement.scrollWidth <= innerWidth', 'Walk-in form fits a phone viewport without horizontal overflow')
  await screenshot('walk-in-form-mobile')
  await click('dialog button[type="submit"]')
  await expect('document.querySelectorAll("tbody tr").length === 5 && [...document.querySelectorAll("tbody tr")].find(tr=>tr.textContent.includes("David M.")).textContent.includes("Walk-in")', 'Walk-in appears in the queue and clears a previously selected stage filter')
  await viewport(1440)
  await click('[aria-label="Dismiss message"]')
  await screenshot('walk-in-queue-desktop')
  await navigate('Patients')
  await expect('[...document.querySelectorAll("tbody tr")].find(tr=>tr.textContent.includes("David M.")).textContent.includes("Today")', 'Walk-in check-in updates the sample patient last-visit label')
  await click('[aria-label="View patient David M."]')
  await click('dialog button', 'Check in demo walk-in')
  await expect('document.querySelector("#walk-in-patient").value === "SP-00024"', 'Walk-in from the patient drawer preserves the registered identity')
  await click('dialog button[type="submit"]')
  await expect('document.querySelector("#walk-in-patient-error").textContent.includes("active visit")', 'A second walk-in check-in is rejected for the same active patient')
  await key('Escape')
  await role('Nurse')
  await navigate('Patient Queue')
  await expect('![...document.querySelectorAll("button")].some(el=>el.textContent.includes("Add demo walk-in"))', 'Nurse queue hides the reception walk-in action')
  await click('[aria-label="Move David M. to Triage"]')
  await click('dialog button', 'Move to Triage')
  await click('[aria-label="Move David M. to Consultation"]')
  await click('dialog button', 'Move to Consultation')
  await role('Doctor')
  await navigate('Patient Queue')
  await click('[aria-label="Move David M. to Completed"]')
  await click('dialog button', 'Move to Completed')
  await navigate('Appointments')
  assert.deepEqual(await evaluate(appointmentDataExpression), appointmentsBeforeWalkIn)
  checks.push('Completing a walk-in leaves all existing appointments unchanged')
  await role('Administrator')
  await navigate('Patient Queue')
  await expect('[...document.querySelectorAll(".page-actions button")].some(el=>el.textContent.includes("Add demo walk-in"))', 'Administrator preview can open walk-in check-in')
  await click('.page-actions button', 'Add demo walk-in')
  await click('dialog button', 'Register a demo patient')
  await expect('!!document.querySelector("#patient-name")', 'Walk-in form can open the existing synthetic patient registration')
  await fill('#patient-name', 'Sample Walk-in Person')
  await fill('#patient-age', '25')
  await click('dialog button[type="submit"]')
  await click('[aria-label="View patient Sample Walk-in Person"]')
  await click('dialog button', 'Check in demo walk-in')
  await expect('document.querySelector("#walk-in-patient").value === "SP-00031"', 'Newly registered patient keeps one identity when entering a walk-in')
  await click('dialog button[type="submit"]')
  await expect('document.querySelectorAll("tbody tr").length === 6', 'A newly registered sample patient can check in without booking an appointment')
  await page.call('Page.reload')
  await waitFor(() => evaluate('!!document.querySelector("#preview-role")'), 'walk-in reload returns to preview entry')
  await click('.login-submit')
  await navigate('Patient Queue')
  await expect('document.querySelectorAll("tbody tr").length === 4 && ![...document.querySelectorAll("tbody tr")].some(tr=>tr.textContent.includes("Walk-in"))', 'Reload discards walk-in visits and restores the initial queue fixtures')
  assert.deepEqual(errors, [], 'No uncaught browser or console errors')
  assert.equal(externalRequests.size, 0, 'No external application requests during the preview')
  const version = await control.call('Browser.getVersion')
  const report = { checkedAt: new Date().toISOString(), testedUrl: url, browser: path.basename(browserPath), browserVersion: version.product, checks: checks.length, passed: checks, browserErrors: errors, externalRequestCount: externalRequests.size }
  writeFileSync('docs/browser-check-results.json', JSON.stringify(report, null, 2) + '\n')
  console.log(`PASS: ${checks.length} browser checks; no browser errors or external application requests. Synthetic screenshots saved in docs/screenshots.`)
} catch (error) {
  if (page) {
    const diagnostic = await evaluate(`({width:innerWidth, scrollWidth:document.documentElement.scrollWidth, overflowing:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(el=>({tag:el.tagName,className:el.className,right:el.getBoundingClientRect().right}))})`).catch(() => null)
    console.error(JSON.stringify(diagnostic))
  }
  throw error
} finally {
  page?.close()
  if (control) { await control.call('Browser.close').catch(() => {}); control.close() }
  else browser.kill()
}
