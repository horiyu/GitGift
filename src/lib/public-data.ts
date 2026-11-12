// Server-side only. Cached public reads for the profile pages.
//
// Every page view used to cost three or four GitHub API requests, so anyone reloading pages
// could exhaust the server's rate limit and take the site down for everyone. Public data is
// therefore cached for a short time per user; the box owner's actions invalidate it.

import { revalidateTag, unstable_cache } from 'next/cache'
import { errorStatus, getBox, getBoxHistory, publicOctokit, type BoxHistory, type BoxInfo } from './github'

const PUBLIC_TTL_SECONDS = 60

export type PublicUser = { login: string; name: string | null; avatarUrl: string; htmlUrl: string; bio: string | null }

function boxTag(login: string): string {
  return `box:${login.toLowerCase()}`
}

function cached<T>(kind: string, login: string, load: () => Promise<T>): Promise<T> {
  return unstable_cache(load, [kind, login.toLowerCase()], {
    revalidate: PUBLIC_TTL_SECONDS,
    tags: [boxTag(login)],
  })()
}

async function loadUser(login: string): Promise<PublicUser | null> {
  try {
    const { data } = await publicOctokit().rest.users.getByUsername({ username: login })
    return { login: data.login, name: data.name, avatarUrl: data.avatar_url, htmlUrl: data.html_url, bio: data.bio }
  } catch (error) {
    if (errorStatus(error) === 404) return null
    throw error
  }
}

export function getPublicUser(login: string): Promise<PublicUser | null> {
  return cached('user', login, () => loadUser(login))
}

// `fresh` skips the cache. The owner's own page uses it so that their actions show up
// without waiting for the cache to expire.
export function getPublicBox(login: string, { fresh = false } = {}): Promise<BoxInfo> {
  const load = () => getBox(publicOctokit(), login)
  return fresh ? load() : cached('box', login, load)
}

export function getPublicHistory(login: string, { fresh = false } = {}): Promise<BoxHistory> {
  const load = () => getBoxHistory(publicOctokit(), login)
  return fresh ? load() : cached('history', login, load)
}

// Called after the owner adds or declines a gift, so visitors see the change on their next load.
export function invalidateBox(login: string): void {
  revalidateTag(boxTag(login))
}
