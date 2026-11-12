import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { BOX_REPO, MAX_MESSAGE_LENGTH, buildGiftIssueBody, giftIssueTitle, isValidLogin, validateMessage } from '@/lib/gift'
import { errorStatus, getBox, guardMutation, unauthorized, viewerFromRequest } from '@/lib/github'

// Wraps a gift: opens an Issue on the recipient's GitGiftBOX as the signed-in sender.
// GitHub records the Issue author, so the sender cannot be spoofed.
export async function POST(req: NextRequest) {
  const rejected = guardMutation(req)
  if (rejected) return rejected
  const viewer = await viewerFromRequest(req)
  if (!viewer) return unauthorized()

  let payload: { to?: unknown; message?: unknown }
  try {
    payload = await req.json()
  } catch {
    return apiError('invalidBody', 400)
  }

  const to = typeof payload.to === 'string' ? payload.to.trim() : ''
  if (!isValidLogin(to)) return apiError('invalidRecipient', 400)
  if (to.toLowerCase() === viewer.login.toLowerCase()) {
    return apiError('selfGift', 400)
  }

  const validation = validateMessage(payload.message)
  if (!validation.ok) return apiError(validation.code, 400, { max: MAX_MESSAGE_LENGTH })

  const { octokit, login } = viewer
  try {
    const box = await getBox(octokit, to)
    if (!box.exists) return apiError('noBox', 404, { to })
    if (!box.hasIssues) {
      return apiError('issuesOff', 409, { to })
    }

    const siteUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin
    const { data: issue } = await octokit.rest.issues.create({
      owner: box.owner,
      repo: BOX_REPO,
      title: giftIssueTitle(login),
      body: buildGiftIssueBody(validation.message, siteUrl),
    })
    return NextResponse.json({ ok: true, url: issue.html_url }, { status: 201 })
  } catch (error) {
    const status = errorStatus(error)
    console.error('Failed to send gift', error)
    if (status === 410) return apiError('issuesOff', 409, { to })
    // A GitHub App token is limited to repositories where the app is installed.
    if (status === 403 || status === 404) {
      return apiError('notConnected', 409, { to })
    }
    return apiError('sendFailed', 502)
  }
}
