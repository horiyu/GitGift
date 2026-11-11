import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { checkMutationRequest, type GuardInput } from '../src/lib/request-guard.ts'
import { isTokenExpired } from '../src/lib/token.ts'

const ORIGIN = 'https://gitgift.example'
const base: GuardInput = {
  method: 'POST',
  origin: ORIGIN,
  secFetchSite: 'same-origin',
  contentType: 'application/json',
  allowedOrigin: ORIGIN,
}

describe('checkMutationRequest (CSRF defence)', () => {
  test('accepts a same-origin JSON POST', () => {
    assert.deepEqual(checkMutationRequest(base), { ok: true })
    assert.deepEqual(checkMutationRequest({ ...base, contentType: 'application/json; charset=utf-8' }), { ok: true })
  })
  test('rejects a cross-origin request', () => {
    assert.equal(checkMutationRequest({ ...base, origin: 'https://evil.example', secFetchSite: 'cross-site' }).ok, false)
    assert.equal(checkMutationRequest({ ...base, origin: 'https://gitgift.example.evil.example' }).ok, false)
    assert.equal(checkMutationRequest({ ...base, origin: 'null' }).ok, false)
  })
  test('rejects HTML form encodings, which a cross-site form could send', () => {
    for (const contentType of ['application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'text/plain', null]) {
      assert.equal(checkMutationRequest({ ...base, contentType }).ok, false, String(contentType))
    }
  })
  test('without an Origin header, accepts only requests the browser marks same-origin', () => {
    assert.equal(checkMutationRequest({ ...base, origin: null, secFetchSite: 'same-origin' }).ok, true)
    assert.equal(checkMutationRequest({ ...base, origin: null, secFetchSite: 'same-site' }).ok, false)
    assert.equal(checkMutationRequest({ ...base, origin: null, secFetchSite: null }).ok, false)
  })
  test('rejects other methods', () => {
    assert.equal(checkMutationRequest({ ...base, method: 'GET' }).ok, false)
  })
})

describe('isTokenExpired', () => {
  test('treats tokens without an expiry as valid', () => {
    assert.equal(isTokenExpired(undefined, 1_000), false)
  })
  test('expires a minute early to avoid mid-request expiry', () => {
    assert.equal(isTokenExpired(1_000, 900), false)
    assert.equal(isTokenExpired(1_000, 940), true)
    assert.equal(isTokenExpired(1_000, 2_000), true)
  })
})
