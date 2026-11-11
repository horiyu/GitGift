import { NextRequest, NextResponse } from 'next/server'
import { BOX_REPO } from '@/lib/gift'
import { loadOpenGift, parseIssueNumber } from '@/lib/gift-issue'
import { errorStatus, guardMutation, unauthorized, viewerFromRequest } from '@/lib/github'

// Declines a gift: closes its Issue as "not planned" without adding it to the README.
export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const rejected = guardMutation(req)
  if (rejected) return rejected
  const viewer = await viewerFromRequest(req)
  if (!viewer) return unauthorized()

  const issueNumber = parseIssueNumber((await params).number)
  if (issueNumber === null) return NextResponse.json({ error: 'Invalid gift.' }, { status: 400 })

  try {
    const loaded = await loadOpenGift(viewer, issueNumber, false)
    if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status })

    await viewer.octokit.rest.issues.update({
      owner: viewer.login,
      repo: BOX_REPO,
      issue_number: loaded.gift.number,
      state: 'closed',
      state_reason: 'not_planned',
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to decline gift', error)
    if (errorStatus(error) === 403) {
      return NextResponse.json({ error: 'Install the GitGift app on your GitGiftBOX first.' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to decline the gift.' }, { status: 502 })
  }
}
