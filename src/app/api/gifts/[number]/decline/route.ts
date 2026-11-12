import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { BOX_REPO } from '@/lib/gift'
import { loadOpenGift, parseIssueNumber } from '@/lib/gift-issue'
import { errorStatus, guardMutation, unauthorized, viewerFromRequest } from '@/lib/github'
import { invalidateBox } from '@/lib/public-data'

// Declines a gift: closes its Issue as "not planned" without adding it to the README.
export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const rejected = guardMutation(req)
  if (rejected) return rejected
  const viewer = await viewerFromRequest(req)
  if (!viewer) return unauthorized()

  const issueNumber = parseIssueNumber((await params).number)
  if (issueNumber === null) return apiError('invalidGift', 400)

  try {
    const loaded = await loadOpenGift(viewer, issueNumber, false)
    if (!loaded.ok) return apiError(loaded.code, loaded.status, loaded.params)

    await viewer.octokit.rest.issues.update({
      owner: viewer.login,
      repo: BOX_REPO,
      issue_number: loaded.gift.number,
      state: 'closed',
      state_reason: 'not_planned',
    })
    invalidateBox(viewer.login)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to decline gift', error)
    if (errorStatus(error) === 403) {
      return apiError('appNotInstalled', 403)
    }
    return apiError('declineFailed', 502)
  }
}
