import type { Demographics, Patient } from './api/types.js'

export function demographics(form: HTMLFormElement): Demographics {
  const data = new FormData(form)
  const text = (name: string) => String(data.get(name) || '').trim()
  const precision = text('birth_precision') as Demographics['birth_precision']
  return { given_name:text('given_name'), family_name:text('family_name'), phone:text('phone'), address:text('address'), birth_precision:precision,
    ...(precision==='exact'?{birth_date:text('birth_date')}:{}), ...(precision==='year'?{birth_year:Number(text('birth_year'))}:{}) }
}
export function validateDemographics(value: Demographics, today: string): string {
  if (!value.given_name || !value.family_name) return 'Enter the patient’s given and family names.'
  if (value.given_name.length>100 || value.family_name.length>100) return 'Names must be 100 characters or fewer.'
  if (value.birth_precision==='exact') {
    const date=value.birth_date||'',parsed=new Date(`${date}T00:00:00Z`)
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date>today)return 'Enter a valid birth date that is not in the future.'
  }
  if (value.birth_precision==='year' && (!Number.isInteger(value.birth_year) || value.birth_year!<1900 || value.birth_year!>Number(today.slice(0,4)))) return 'Enter a birth year from 1900 through the current year.'
  return ''
}
// PUT replaces all demographics. Preserve fields not edited in this form.
export function patientUpdate(patient: Patient, edited: Demographics) {
  const { middle_name, preferred_name, region, district, ward, sex, marital_status,
    occupation, nationality, preferred_language, blood_group } = patient
  return { middle_name, preferred_name, region, district, ward, sex, marital_status,
    occupation, nationality, preferred_language, blood_group, ...edited, version: patient.version }
}
/** Retain the key for an unchanged payload, including after an ambiguous network failure. */
export class RegistrationKey {
  private payload = ''
  private key = ''
  constructor(private generate: () => string = () => crypto.randomUUID()) {}
  reset() { this.payload = ''; this.key = '' }
  forPayload(value: unknown) {
    const payload = JSON.stringify(value)
    if (payload!==this.payload || !this.key) {this.payload=payload;this.key=this.generate()}
    return this.key
  }
}
