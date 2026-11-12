// Server-side only: used by Route Handlers and Server Components, never by client components.

import { Octokit } from '@octokit/rest'
import { getToken } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiError } from './api-error'
import { isTokenExpired } from './token'
import {
  BOX_REPO,
  IssueEvidence,
  VerifiedGift,
  boxIssueNumber,
  isGiftIssueBody,
  parseGiftIssueBody,
  parseRows,
  verifyRows,
} from './gift'
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

// When GITHUB_TOKEN was last rejected. It is retried after a cool-down, so a transient 401
// does not leave the server on the unauthenticated rate limit (60 requests/hour) for good.
let tokenRejectedAt = 0
const TOKEN_RETRY_MS = 5 * 60 * 1000
let warnedMissingToken = false

// For public reads. GITHUB_TOKEN is server-only. It raises the rate limit from 60 to 5,000
// requests/hour and is needed to verify gift history (GitHub's GraphQL API requires a token),
// so production deployments should always set it. An expired or revoked token falls back to
// unauthenticated requests instead of failing.
export function publicOctokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token && process.env.NODE_ENV === 'production' && !warnedMissingToken) {
    warnedMissingToken = true
    console.warn('GITHUB_TOKEN is not set: public reads are limited to 60 requests/hour and gift history cannot be verified.')
  }
  const tokenRejected = Date.now() - tokenRejectedAt < TOKEN_RETRY_MS
  if (!token || tokenRejected) return createOctokit()

  const octokit = createOctokit(token)
  octokit.hook.wrap('request', async (request, options) => {
    try {
      return await request(options)
    } catch (error) {
      if (errorStatus(error) !== 401) throw error
      if (Date.now() - tokenRejectedAt >= TOKEN_RETRY_MS) {
        console.warn('GITHUB_TOKEN was rejected by GitHub (401); using unauthenticated requests for 5 minutes.')
      }
      tokenRejectedAt = Date.now()
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
  return result.ok ? null : apiError('requestRejected', 403)
}

export function unauthorized(): NextResponse {
  return apiError('sessionExpired', 401)
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

// At most this many of the latest README rows are verified and shown.
export const HISTORY_LIMIT = 100

export type BoxHistory = {
  // Rows GitHub can vouch for, oldest first.
  gifts: VerifiedGift[]
  // Every Issue the README links to, verified or not; used to hide gifts that were already added.
  recordedIssueUrls: string[]
  // Rows that are shown nowhere because they could not be verified.
  unverifiedCount: number
  // 'unavailable' when verification could not run (no usable GITHUB_TOKEN); nothing is shown then.
  status: 'ok' | 'unavailable'
}

export async function getBoxHistory(octokit: Octokit, owner: string): Promise<BoxHistory> {
  const readme = await getReadme(octokit, owner)
  const rows = readme ? parseRows(readme.text).slice(-HISTORY_LIMIT) : []
  const recordedIssueUrls = rows.flatMap((row) => (row.issueUrl ? [row.issueUrl] : []))
  const numbers = Array.from(new Set(rows.flatMap((row) => boxIssueNumber(row.issueUrl, owner) ?? [])))
  let evidence: Map<number, IssueEvidence>
  try {
    evidence = await getIssueEvidence(octokit, owner, numbers)
  } catch (error) {
    console.error('Could not verify gift history', error)
    return { gifts: [], recordedIssueUrls, unverifiedCount: 0, status: 'unavailable' }
  }
  const gifts = verifyRows(rows, owner, evidence)
  return { gifts, recordedIssueUrls, unverifiedCount: rows.length - gifts.length, status: 'ok' }
}

type GraphqlIssue = { number: number; author: { login: string } | null; editor: { login: string } | null; body: string }

// Author, last editor and body of the given Issues, in one GraphQL request per 50 Issues.
async function getIssueEvidence(octokit: Octokit, owner: string, numbers: number[]): Promise<Map<number, IssueEvidence>> {
  const evidence = new Map<number, IssueEvidence>()
  for (let i = 0; i < numbers.length; i += 50) {
    const chunk = numbers.slice(i, i + 50)
    // Numbers come from boxIssueNumber(), so they are plain integers and safe to inline.
    const fields = chunk.map((n) => `i${n}: issue(number: ${n}) { number author { login } editor { login } body }`)
    const query = `query ($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields.join(' ')} } }`
    let data: { repository: Record<string, GraphqlIssue | null> | null }
    try {
      data = await octokit.graphql(query, { owner, name: BOX_REPO })
    } catch (error) {
      // A number that is not an Issue (deleted, or a pull request) fails only its own field;
      // GitHub still returns the other fields as partial data.
      const partial = (error as { data?: typeof data }).data
      if (!partial?.repository) throw error
      data = partial
    }
    for (const issue of Object.values(data.repository ?? {})) {
      if (!issue) continue
      evidence.set(issue.number, {
        number: issue.number,
        author: issue.author?.login ?? null,
        editor: issue.editor?.login ?? null,
        body: issue.body,
      })
    }
  }
  return evidence
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
