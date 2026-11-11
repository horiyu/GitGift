import { NextRequest, NextResponse } from 'next/server'
import { BOX_REPO, buildGiftIssueBody, giftIssueTitle, isValidLogin, validateMessage } from '@/lib/gift'
import { errorStatus, getBox, viewerFromRequest } from '@/lib/github'

// Wraps a gift: opens an Issue on the recipient's GitGiftBOX as the signed-in sender.
// GitHub records the Issue author, so the sender cannot be spoofed.
export async function POST(req: NextRequest) {
  const viewer = await viewerFromRequest(req)
  if (!viewer) return NextResponse.json({ error: 'Please sign in again to send a gift.' }, { status: 401 })

  let payload: { to?: unknown; message?: unknown }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const to = typeof payload.to === 'string' ? payload.to.trim() : ''
  if (!isValidLogin(to)) return NextResponse.json({ error: 'Invalid recipient.' }, { status: 400 })
  if (to.toLowerCase() === viewer.login.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot send a gift to yourself.' }, { status: 400 })
  }

  const validation = validateMessage(payload.message)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const { octokit, login } = viewer
  try {
    const box = await getBox(octokit, to)
    if (!box.exists) return NextResponse.json({ error: `@${to} does not have a GitGiftBOX yet.` }, { status: 404 })
    if (!box.hasIssues) {
      return NextResponse.json({ error: `@${to}'s GitGiftBOX cannot receive gifts yet.` }, { status: 409 })
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
    if (status === 410) return NextResponse.json({ error: `@${to}'s GitGiftBOX has Issues disabled.` }, { status: 409 })
    if (status === 403) return NextResponse.json({ error: 'GitHub refused the request. Try signing in again.' }, { status: 403 })
    return NextResponse.json({ error: 'Failed to send the gift.' }, { status: 502 })
  }
}
