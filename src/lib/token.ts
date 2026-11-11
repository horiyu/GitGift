// Pure helpers about GitHub user access tokens (kept free of imports so they can be unit-tested).

export function isTokenExpired(expiresAt: number | undefined, nowSeconds = Date.now() / 1000): boolean {
  // A small margin so that a token does not expire in the middle of a request.
  return typeof expiresAt === 'number' && nowSeconds >= expiresAt - 60
}
