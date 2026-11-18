import type { Actor, Challenge, Tokens } from './types.js'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}, public requestId = '') {
    super(message); this.name = 'ApiError'
  }
}
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>
type RequestOptions = { method?: string; body?: unknown; headers?: Record<string,string>; signal?: AbortSignal }

/** Only the backend writes the HttpOnly refresh cookie. Access tokens stay in memory. */
export class ApiClient {
  private accessToken = ''
  private expiresAt = 0
  private generation = 0
  private refreshing: Promise<void> | null = null
  private restoring: Promise<Actor> | null = null
  onSessionLost: () => void = () => {}
  constructor(private baseURL: string, private fetcher: Fetcher = (input,init) => fetch(input,init)) { this.baseURL = baseURL.replace(/\/$/,'') }
  clear() { this.generation++; this.accessToken = ''; this.expiresAt = 0 }
  private accept(value: Tokens, generation: number) {
    if (generation !== this.generation) throw new ApiError(401,'session_changed','Your session changed. Sign in again.')
    if (!value || typeof value.access_token !== 'string' || !value.access_token || value.token_type !== 'Bearer' || !(value.expires_in > 0)) throw new ApiError(502,'invalid_response','The sign-in service returned an unexpected response.')
    this.accessToken = value.access_token; this.expiresAt = Date.now() + value.expires_in * 1000
  }
  private async send<T>(path: string, options: RequestOptions = {}, token = ''): Promise<T> {
    const controller = new AbortController()
    const abort = () => controller.abort(options.signal?.reason)
    options.signal?.addEventListener('abort',abort,{once:true})
    if (options.signal?.aborted) abort()
    const timeout = setTimeout(()=>controller.abort(),20000)
    try {
      const response = await this.fetcher(`${this.baseURL}${path}`, {
        method:options.method ?? 'GET', credentials:'include', cache:'no-store', signal:controller.signal,
        headers:{Accept:'application/json',...(options.body !== undefined ? {'Content-Type':'application/json'} : {}),...(token ? {Authorization:`Bearer ${token}`} : {}),...options.headers},
        ...(options.body !== undefined ? {body:JSON.stringify(options.body)} : {}),
      })
      if (response.status === 204) return undefined as T
      const value = await response.json().catch(()=>null)
      if (!response.ok) {
        const fields = Object.fromEntries(Object.entries(value?.error?.fields || {}).filter(([,v])=>typeof v==='string')) as Record<string,string>
        throw new ApiError(response.status,value?.error?.code || 'request_failed',value?.error?.message || `The request failed (${response.status}).`,fields,value?.request_id || '')
      }
      if (value === null) throw new ApiError(502,'invalid_response','The service returned an unexpected response.')
      return value as T
    } catch (error) {
      if (error instanceof ApiError || options.signal?.aborted) throw error
      throw new ApiError(0,'network_error','The service could not be reached. Check your connection and try again.')
    } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort',abort) }
  }
  private refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing
    const generation = this.generation
    const rotate = async () => {
      if (generation !== this.generation) throw new ApiError(401,'session_changed','Sign in again.')
      // Rotation is single-use. Never retry after an ambiguous network failure.
      this.accept(await this.send<Tokens>('/auth/refresh',{method:'POST',body:{client_type:'web'}}),generation)
    }
    const locked = async () => {
      if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request('spartial-refresh',rotate)
      else await rotate()
    }
    this.refreshing = locked().catch(error=>{if(generation===this.generation){this.clear();this.onSessionLost()}throw error}).finally(()=>{this.refreshing=null})
    return this.refreshing
  }
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.accessToken) throw new ApiError(401,'not_authenticated','Sign in to continue.')
    if (Date.now() >= this.expiresAt) await this.refresh()
    const generation = this.generation, token = this.accessToken
    const checked = async (credential: string) => {
      const result = await this.send<T>(path,options,credential)
      if (generation !== this.generation) throw new ApiError(401,'session_changed','Your session changed. Sign in again.')
      return result
    }
    try { return await checked(token) }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || generation !== this.generation) throw error
      if (token === this.accessToken) await this.refresh()
      if (generation !== this.generation || !this.accessToken) throw error
      try { return await checked(this.accessToken) }
      catch (retryError) {
        if (retryError instanceof ApiError && retryError.status===401 && generation===this.generation) {this.clear();this.onSessionLost()}
        throw retryError
      }
    }
  }
  async me(): Promise<Actor> {
    const actor = await this.request<Actor>('/auth/me')
    if (!actor?.active || typeof actor.id !== 'string' || !Array.isArray(actor.permissions) || !Array.isArray(actor.facility_ids) || typeof actor.role !== 'string') {
      this.clear(); throw new ApiError(401,'invalid_session','Your account is unavailable. Contact your administrator.')
    }
    return actor
  }
  restore(): Promise<Actor> {
    if (this.restoring) return this.restoring
    this.restoring = this.refresh().then(()=>this.me()).finally(()=>{this.restoring=null})
    return this.restoring
  }
  async login(email: string, password: string): Promise<Actor | Challenge> {
    this.clear(); const generation = this.generation
    const value = await this.send<Tokens|Challenge>('/auth/login',{method:'POST',body:{email,password,client_type:'web',device_label:'Staff web workspace'}})
    if (generation !== this.generation) throw new ApiError(401,'session_changed','Sign in again.')
    if ('mfa_required' in value && value.mfa_required) return value
    this.accept(value as Tokens,generation); return this.me()
  }
  async verify(challenge: string, factor: {code?:string;recovery_code?:string}): Promise<Actor> {
    const generation = this.generation
    this.accept(await this.send<Tokens>('/auth/mfa/verify',{method:'POST',body:{challenge_token:challenge,client_type:'web',...factor}}),generation)
    return this.me()
  }
  async logout(): Promise<void> {
    const generation = this.generation
    try { await this.request('/auth/logout',{method:'POST'}) } finally { if(generation===this.generation)this.clear() }
  }
}
