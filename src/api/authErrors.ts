import { ApiError } from './client.js'

export function signInError(error: unknown): Error {
  if (error instanceof ApiError) {
    if (error.code === 'account_disabled' || error.code === 'account_inactive') return new Error('Your account is disabled. Contact your administrator.')
    if (error.code === 'origin_denied') return new Error('The sign-in service rejected this application origin. Contact your administrator.')
    if (error.status === 401) return new Error('The username or password is incorrect, or the sign-in challenge has expired.')
    if (error.status === 403) return new Error('Sign-in is not permitted for this account. Contact your administrator.')
    if (error.status === 0 || error.status >= 500) return new Error('The sign-in service is unavailable. Please try again later.')
  }
  return new Error('Sign-in could not be completed. Please try again.')
}
