import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { BOX_REPO, appendRow, hasRowForIssue } from '@/lib/gift'
import { loadOpenGift, parseIssueNumber } from '@/lib/gift-issue'
import { errorStatus, getReadme, guardMutation, noreplyEmail, unauthorized, viewerFromRequest } from '@/lib/github'
import { invalidateBox } from '@/lib/public-data'

// Opens a gift: the box owner appends the message to README.md as a commit authored
// by the sender, then closes the Issue the gift was wrapped in.
export async function POST(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const rejected = guardMutation(req)
  if (rejected) return rejected
  const viewer = await viewerFromRequest(req)
  if (!viewer) return unauthorized()

  const issueNumber = parseIssueNumber((await params).number)
  if (issueNumber === null) return apiError('invalidGift', 400)

  const { octokit, login: owner } = viewer
  try {
    const loaded = await loadOpenGift(viewer, issueNumber, true)
    if (!loaded.ok) return apiError(loaded.code, loaded.status, loaded.params)
    const { gift } = loaded

    for (let attempt = 0; ; attempt++) {
      const readme = await getReadme(octokit, owner)
      // A previous attempt may have committed but failed to close the Issue; do not add the row twice.
      if (readme && hasRowForIssue(readme.text, gift.htmlUrl)) break

      const content = appendRow(readme?.text ?? '', {
        date: gift.createdAt.slice(0, 10),
        from: gift.sender.login,
        message: gift.message,
        issueUrl: gift.htmlUrl,
      })
      try {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo: BOX_REPO,
          path: 'README.md',
          message: `gift: from @${gift.sender.login} (#${gift.number})`,
          content: Buffer.from(content, 'utf8').toString('base64'),
          sha: readme?.sha,
          // The sender wrote the message, so they are the author; the box owner is the committer.
          author: { name: gift.sender.login, email: noreplyEmail(gift.sender.login, gift.sender.id) },
        })
        break
      } catch (error) {
        // 409: README changed between read and write (e.g. two gifts opened at once). Retry on the new version.
        if (errorStatus(error) !== 409 || attempt >= 2) throw error
      }
    }

    await octokit.rest.issues.update({
      owner,
      repo: BOX_REPO,
      issue_number: gift.number,
      state: 'closed',
      state_reason: 'completed',
    })
    invalidateBox(owner)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to open gift', error)
    if (errorStatus(error) === 403) {
      return apiError('appNotInstalled', 403)
    }
    return apiError('openFailed', 502)
  }
}
