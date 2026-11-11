import { NextRequest, NextResponse } from 'next/server'
import { BOX_REPO, appendRow, hasRowForIssue, isGiftIssueBody, parseGiftIssueBody } from '@/lib/gift'
import { errorStatus, getReadme, noreplyEmail, viewerFromRequest } from '@/lib/github'

// Opens a gift: the box owner appends the message to README.md as a commit authored
// by the sender, then closes the Issue the gift was wrapped in.
export async function POST(req: NextRequest, { params }: { params: { number: string } }) {
  const viewer = await viewerFromRequest(req)
  if (!viewer) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const issueNumber = Number(params.number)
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    return NextResponse.json({ error: 'Invalid gift.' }, { status: 400 })
  }

  const { octokit, login: owner } = viewer
  try {
    const { data: issue } = await octokit.rest.issues.get({ owner, repo: BOX_REPO, issue_number: issueNumber })
    const message = parseGiftIssueBody(issue.body)
    if (issue.pull_request || !issue.user || !isGiftIssueBody(issue.body) || !message) {
      return NextResponse.json({ error: 'This Issue is not a gift.' }, { status: 400 })
    }
    if (issue.state !== 'open') return NextResponse.json({ error: 'This gift is already opened.' }, { status: 409 })

    const sender = issue.user
    for (let attempt = 0; ; attempt++) {
      const readme = await getReadme(octokit, owner)
      // A previous attempt may have committed but failed to close the Issue; do not add the row twice.
      if (readme && hasRowForIssue(readme.text, issue.html_url)) break

      const content = appendRow(readme?.text ?? '', {
        date: issue.created_at.slice(0, 10),
        from: sender.login,
        message,
        issueUrl: issue.html_url,
      })
      try {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo: BOX_REPO,
          path: 'README.md',
          message: `gift: from @${sender.login} (#${issue.number})`,
          content: Buffer.from(content, 'utf8').toString('base64'),
          sha: readme?.sha,
          // The sender wrote the message, so they are the author; the box owner is the committer.
          author: { name: sender.login, email: noreplyEmail(sender.login, sender.id) },
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
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'completed',
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to open gift', error)
    if (errorStatus(error) === 404) return NextResponse.json({ error: 'Gift not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to open the gift.' }, { status: 502 })
  }
}
