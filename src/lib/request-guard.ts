// CSRF defence in depth for the state-changing API routes. The session cookie is already
// SameSite=Lax; these checks additionally reject cross-site requests and HTML form posts.

export type GuardInput = {
  method: string
  origin: string | null
  secFetchSite: string | null
  contentType: string | null
  allowedOrigin: string
}

export function checkMutationRequest(input: GuardInput): { ok: true } | { ok: false; error: string } {
  if (input.method !== 'POST') return { ok: false, error: 'Method not allowed.' }

  // HTML forms cannot send application/json, so requiring it blocks form-based CSRF.
  const mediaType = input.contentType?.split(';')[0].trim().toLowerCase()
  if (mediaType !== 'application/json') return { ok: false, error: 'Content-Type must be application/json.' }

  if (input.origin !== null) {
    if (input.origin !== input.allowedOrigin) return { ok: false, error: 'Cross-origin request rejected.' }
  } else if (input.secFetchSite !== 'same-origin') {
    // Browsers send Origin on POST; without it, only accept requests the browser marks as same-origin.
    return { ok: false, error: 'Cross-origin request rejected.' }
  }
  return { ok: true }
}

export function originOf(url: string): string {
  return new URL(url).origin
}
