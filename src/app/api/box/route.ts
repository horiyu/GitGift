import { NextRequest, NextResponse } from 'next/server'
import { BOX_REPO } from '@/lib/gift'
import { BOX_TEMPLATE, errorStatus, getBox, viewerFromRequest } from '@/lib/github'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Creates the signed-in user's GitGiftBOX (if missing) and makes sure it can receive gifts.
// Idempotent: calling it on an existing box only re-enables Issues.
export async function POST(req: NextRequest) {
  const viewer = await viewerFromRequest(req)
  if (!viewer) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const { octokit, login } = viewer

  try {
    let box = await getBox(octokit, login)

    if (!box.exists) {
      if (login.toLowerCase() === BOX_TEMPLATE.owner.toLowerCase()) {
        return NextResponse.json({ error: `Create ${login}/${BOX_REPO} manually; you own the template.` }, { status: 409 })
      }
      await octokit.rest.repos.createFork({
        owner: BOX_TEMPLATE.owner,
        repo: BOX_TEMPLATE.repo,
        name: BOX_REPO,
        default_branch_only: true,
      })
      // Forking is asynchronous; wait until the repository is reachable.
      for (let attempt = 0; attempt < 10 && !box.exists; attempt++) {
        await sleep(1000)
        box = await getBox(octokit, login)
      }
      if (!box.exists) {
        return NextResponse.json({ error: 'GitHub is still preparing your box. Try again in a moment.' }, { status: 202 })
      }
    }

    // Forks have Issues disabled by default, but gifts arrive as Issues.
    if (!box.hasIssues) {
      for (let attempt = 0; ; attempt++) {
        try {
          await octokit.rest.repos.update({ owner: login, repo: BOX_REPO, has_issues: true })
          break
        } catch (error) {
          if (attempt >= 4 || errorStatus(error) !== 404) throw error
          await sleep(1000)
        }
      }
    }

    return NextResponse.json({ ok: true, url: box.htmlUrl })
  } catch (error) {
    console.error('Failed to prepare GitGiftBOX', error)
    return NextResponse.json({ error: 'Failed to prepare your GitGiftBOX.' }, { status: 502 })
  }
}
