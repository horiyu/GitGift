// Server-side only: used by Route Handlers and Server Components, never by client components.

import { Octokit } from '@octokit/rest'
import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isTokenExpired } from './token'
import { BOX_REPO, GiftRow, isGiftIssueBody, parseGiftIssueBody, parseRows } from './gift'
import { checkMutationRequest, originOf } from './request-guard'

// Slug of the GitGift GitHub App, i.e. https://github.com/apps/<slug>.
export const APP_SLUG = process.env.GITHUB_APP_SLUG ?? ''

export function appInstallUrl(): string | null {
  return APP_SLUG ? `https://github.com/apps/${APP_SLUG}/installations/new` : null
}

export const NEW_BOX_URL = `https://github.com/new?name=${BOX_REPO}&visibility=public&description=${encodeURIComponent(
  'My GitGift box: messages people gifted me through Git.',
)}`

// Next.js may cache fetch() in server code; GitHub data must always be fresh.
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' })

function createOctokit(auth?: string) {
  return new Octokit({ auth, request: { fetch: noStoreFetch } })
}

let tokenRejected = false

// For public reads. GITHUB_TOKEN is optional and server-only; it only raises the rate limit,
// so an expired or revoked token falls back to unauthenticated requests instead of failing.
export function publicOctokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token || tokenRejected) return createOctokit()

  const octokit = createOctokit(token)
  octokit.hook.wrap('request', async (request, options) => {
    try {
      return await request(options)
    } catch (error) {
      if (errorStatus(error) !== 401) throw error
      if (!tokenRejected) {
        tokenRejected = true
        console.warn('GITHUB_TOKEN was rejected by GitHub (401); using unauthenticated requests from now on.')
      }
      // Re-issue once through a fresh client: no token and no hooks, so this cannot recurse.
      const { method, url, headers: _headers, request: _request, baseUrl: _baseUrl, ...params } = options
      return createOctokit().request(`${method} ${url}`, params)
    }
  })
  return octokit
}

export type Viewer = { octokit: Octokit; login: string; id: number }

type TokenSource = Parameters<typeof getToken>[0]['req']

async function viewerFrom(req: TokenSource): Promise<Viewer | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.accessToken || !token.login || typeof token.githubId !== 'number') return null
  if (isTokenExpired(token.expiresAt)) return null
  return { octokit: createOctokit(token.accessToken), login: token.login, id: token.githubId }
}

// Acts on GitHub as the signed-in user. Returns null when there is no usable token
// (signed out, token expired, or a session from before the GitHub App migration).
export function viewerFromRequest(req: NextRequest): Promise<Viewer | null> {
  return viewerFrom(req)
}

// Same as viewerFromRequest, for Server Components.
export async function viewerFromCookies(): Promise<Viewer | null> {
  return viewerFrom({ cookies: await cookies(), headers: {} } as unknown as TokenSource)
}

// Rejects cross-site and non-JSON requests to state-changing routes (CSRF defence in depth).
export function guardMutation(req: NextRequest): NextResponse | null {
  const allowedOrigin = process.env.NEXTAUTH_URL ? originOf(process.env.NEXTAUTH_URL) : req.nextUrl.origin
  const result = checkMutationRequest({
    method: req.method,
    origin: req.headers.get('origin'),
    secFetchSite: req.headers.get('sec-fetch-site'),
    contentType: req.headers.get('content-type'),
    allowedOrigin,
  })
  return result.ok ? null : NextResponse.json({ error: result.error }, { status: 403 })
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Your GitHub session has expired. Please sign in again.' }, { status: 401 })
}

export function errorStatus(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status: unknown }).status)
    : undefined
}

export function noreplyEmail(login: string, id: number): string {
  return `${id}+${login}@users.noreply.github.com`
}

export type BoxInfo = { exists: false } | { exists: true; hasIssues: boolean; htmlUrl: string; owner: string }

export async function getBox(octokit: Octokit, owner: string): Promise<BoxInfo> {
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo: BOX_REPO })
    // Gifts are public by design; a private repository would not be readable by senders.
    if (data.private) return { exists: false }
    return { exists: true, hasIssues: data.has_issues, htmlUrl: data.html_url, owner: data.owner.login }
  } catch (error) {
    if (errorStatus(error) === 404) return { exists: false }
    throw error
  }
}

export type BoxConnection = 'connected' | 'not-connected' | 'reauth'

// Whether the viewer has installed the GitGift GitHub App on their own GitGiftBOX.
// 'reauth': the session's token is not a GitGift GitHub App token (e.g. a session created
// with the former OAuth App), so the user has to sign in again.
export async function getBoxConnection(viewer: Viewer): Promise<BoxConnection> {
  if (!APP_SLUG) return 'not-connected'
  try {
    return (await isBoxConnected(viewer)) ? 'connected' : 'not-connected'
  } catch (error) {
    const status = errorStatus(error)
    if (status === 401 || status === 403) return 'reauth'
    throw error
  }
}

async function isBoxConnected(viewer: Viewer): Promise<boolean> {
  const installations = await viewer.octokit.paginate(viewer.octokit.rest.apps.listInstallationsForAuthenticatedUser, {
    per_page: 100,
  })
  const mine = installations.filter((installation) => {
    const account = installation.account
    const accountLogin = account && 'login' in account ? account.login : undefined
    return installation.app_slug === APP_SLUG && accountLogin?.toLowerCase() === viewer.login.toLowerCase()
  })
  for (const installation of mine) {
    if (installation.repository_selection === 'all') return true
    // paginate() flattens the `repositories` key of each page into a single array.
    const repos = (await viewer.octokit.paginate(viewer.octokit.rest.apps.listInstallationReposForAuthenticatedUser, {
      installation_id: installation.id,
      per_page: 100,
    })) as unknown as Array<{ name: string }>
    if (repos.some((repo) => repo.name === BOX_REPO)) return true
  }
  return false
}

export async function getReadme(octokit: Octokit, owner: string): Promise<{ text: string; sha: string } | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo: BOX_REPO, path: 'README.md' })
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null
    return { text: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }
  } catch (error) {
    if (errorStatus(error) === 404) return null
    throw error
  }
}

export async function getOpenedGifts(octokit: Octokit, owner: string): Promise<GiftRow[]> {
  const readme = await getReadme(octokit, owner)
  return readme ? parseRows(readme.text) : []
}

export type PendingGift = { number: number; from: string; createdAt: string; htmlUrl: string; message: string }

export async function getPendingGifts(octokit: Octokit, owner: string): Promise<PendingGift[]> {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo: BOX_REPO,
    state: 'open',
    per_page: 100,
  })
  return issues
    .filter((issue) => !issue.pull_request && issue.user && isGiftIssueBody(issue.body))
    .flatMap((issue) => {
      const message = parseGiftIssueBody(issue.body)
      if (!message || !issue.user) return []
      return [{ number: issue.number, from: issue.user.login, createdAt: issue.created_at, htmlUrl: issue.html_url, message }]
    })
}

// Who last edited the Issue body. The box owner can edit any Issue in their repository,
// so a body edited by someone other than the author must not be attributed to the author.
export async function getIssueLastEditor(octokit: Octokit, owner: string, number: number): Promise<string | null> {
  const result = await octokit.graphql<{
    repository: { issue: { editor: { login: string } | null } | null } | null
  }>(
    `query ($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) { issue(number: $number) { editor { login } } }
    }`,
    { owner, name: BOX_REPO, number },
  )
  return result.repository?.issue?.editor?.login ?? null
}
