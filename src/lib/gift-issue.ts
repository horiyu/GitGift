// Loads a gift Issue from the viewer's own box and checks that it is safe to act on.

import type { Viewer } from './github'
import { errorStatus, getIssueLastEditor } from './github'
import { BOX_REPO, isGiftIssueBody, parseGiftIssueBody, validateMessage } from './gift'

export type LoadedGift = {
  number: number
  htmlUrl: string
  createdAt: string
  sender: { login: string; id: number }
  message: string
}

export type LoadResult = { ok: true; gift: LoadedGift } | { ok: false; status: number; error: string }

export function parseIssueNumber(raw: string): number | null {
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

// `forOpening` additionally enforces the rules that matter before content is committed under
// the sender's name: the message passes the same validation as on send (the Issue may have been
// created directly on GitHub, bypassing GitGift), and nobody but the sender edited it.
export async function loadOpenGift(viewer: Viewer, issueNumber: number, forOpening: boolean): Promise<LoadResult> {
  const { octokit, login: owner } = viewer
  let issue
  try {
    ;({ data: issue } = await octokit.rest.issues.get({ owner, repo: BOX_REPO, issue_number: issueNumber }))
  } catch (error) {
    const status = errorStatus(error)
    if (status === 404) return { ok: false, status: 404, error: 'Gift not found.' }
    if (status === 403) return { ok: false, status: 403, error: 'Install the GitGift app on your GitGiftBOX first.' }
    throw error
  }

  if (issue.pull_request || !issue.user || !isGiftIssueBody(issue.body)) {
    return { ok: false, status: 400, error: 'This Issue is not a gift.' }
  }
  if (issue.state !== 'open') return { ok: false, status: 409, error: 'This gift has already been opened or declined.' }

  const raw = parseGiftIssueBody(issue.body)
  const sender = { login: issue.user.login, id: issue.user.id }
  if (!forOpening) {
    return { ok: true, gift: { number: issue.number, htmlUrl: issue.html_url, createdAt: issue.created_at, sender, message: raw ?? '' } }
  }

  const validation = validateMessage(raw ?? '')
  if (!validation.ok || validation.message !== raw) {
    return { ok: false, status: 422, error: `This gift cannot be added to your box (${validation.ok ? 'malformed' : validation.error}). You can decline it.` }
  }

  const editor = await getIssueLastEditor(octokit, owner, issue.number)
  if (editor && editor.toLowerCase() !== sender.login.toLowerCase()) {
    return {
      ok: false,
      status: 409,
      error: `This gift was edited by @${editor} after @${sender.login} sent it, so it cannot be added under @${sender.login}'s name. You can decline it.`,
    }
  }

  return {
    ok: true,
    gift: { number: issue.number, htmlUrl: issue.html_url, createdAt: issue.created_at, sender, message: validation.message },
  }
}
