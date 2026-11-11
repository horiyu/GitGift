// Server-side only: used by Route Handlers and Server Components, never by client components.

import { Octokit } from '@octokit/rest'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { BOX_REPO, GiftRow, isGiftIssueBody, parseGiftIssueBody, parseRows } from './gift'

// Repository that every new GitGiftBOX is forked from.
export const BOX_TEMPLATE = { owner: 'horiyu', repo: 'GitGiftBOX-Fork' } as const

// Next.js caches fetch() in server code by default; GitHub data must always be fresh.
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

// Acts on GitHub as the signed-in user. Returns null when the session lacks a token
// (e.g. a session created before the public_repo scope was requested).
export async function viewerFromRequest(req: NextRequest): Promise<Viewer | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.accessToken || !token.login || typeof token.githubId !== 'number') return null
  return { octokit: createOctokit(token.accessToken), login: token.login, id: token.githubId }
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
    return { exists: true, hasIssues: data.has_issues, htmlUrl: data.html_url, owner: data.owner.login }
  } catch (error) {
    if (errorStatus(error) === 404) return { exists: false }
    throw error
  }
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
