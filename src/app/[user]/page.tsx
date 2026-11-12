import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import {
  AlertIcon,
  CheckCircleFillIcon,
  GiftIcon,
  IssueClosedIcon,
  LinkExternalIcon,
  MarkGithubIcon,
  PackageIcon,
  RepoIcon,
} from '@primer/octicons-react'
import { authOptions } from '@/lib/auth'
import { BOX_REPO, isValidLogin } from '@/lib/gift'
import {
  NEW_BOX_URL,
  appInstallUrl,
  errorStatus,
  getBox,
  getOpenedGifts,
  getPendingGifts,
  getBoxConnection,
  publicOctokit,
  viewerFromCookies,
} from '@/lib/github'
import { SignInButton } from '@/components/Button/AuthButtons'
import PendingGifts from '@/components/Gift/PendingGifts'
import SendGiftForm from '@/components/Gift/SendGiftForm'
import ShareBoxLink from '@/components/Gift/ShareBoxLink'
import styles from './user.module.css'

export const dynamic = 'force-dynamic'

async function getUser(login: string) {
  try {
    const { data } = await publicOctokit().rest.users.getByUsername({ username: login })
    return data
  } catch (error) {
    if (errorStatus(error) === 404) return null
    throw error
  }
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function issueNumber(url: string | undefined): string | null {
  const match = url?.match(/\/issues\/(\d+)$/)
  return match ? match[1] : null
}

export default async function UserPage({ params }: { params: Promise<{ user: string }> }) {
  const login = safeDecode((await params).user)
  if (!login || !isValidLogin(login)) notFound()

  const [user, session] = await Promise.all([getUser(login), getServerSession(authOptions)])
  if (!user) notFound()

  const octokit = publicOctokit()
  const box = await getBox(octokit, user.login)
  const viewerLogin = session?.user?.login
  const sessionExpired = !!session && !!session.user?.tokenExpired
  const isThisMe = !!viewerLogin && viewerLogin.toLowerCase() === user.login.toLowerCase()
  const name = user.name || user.login

  // Only the owner needs to know whether the GitGift app can act on the box.
  const viewer = isThisMe && box.exists && !sessionExpired ? await viewerFromCookies() : null
  const connection = viewer ? await getBoxConnection(viewer) : 'not-connected'
  const connected = connection === 'connected'
  const needsReauth = sessionExpired || connection === 'reauth'
  const installUrl = appInstallUrl()
  const canReceive = box.exists && box.hasIssues

  const [opened, pending] = box.exists
    ? await Promise.all([
        getOpenedGifts(octokit, user.login),
        isThisMe && box.hasIssues ? getPendingGifts(octokit, user.login) : Promise.resolve([]),
      ])
    : [[], []]

  const repoReady = box.exists && box.hasIssues
  const setupSteps = [
    {
      done: repoReady,
      title: box.exists && !box.hasIssues ? 'Turn on Issues for your box' : `Create a public repository named ${BOX_REPO}`,
      detail: box.exists && !box.hasIssues ? 'Gifts arrive as Issues, so the box needs them enabled.' : 'This repository is your box.',
      action: box.exists ? (
        !box.hasIssues && (
          <a className="btn" href={`${box.htmlUrl}/settings`} target="_blank" rel="noreferrer">
            Open settings <LinkExternalIcon size={16} />
          </a>
        )
      ) : (
        <a className="btn btn-primary" href={NEW_BOX_URL} target="_blank" rel="noreferrer">
          <RepoIcon size={16} /> Create repository
        </a>
      ),
    },
    {
      done: connected,
      title: 'Install the GitGift app on the box',
      detail: (
        <>
          Choose <b>Only select repositories → {BOX_REPO}</b>. The app gets no access to anything else.
        </>
      ),
      action: installUrl ? (
        <a className={`btn ${repoReady ? 'btn-primary' : ''}`} href={installUrl} target="_blank" rel="noreferrer">
          <MarkGithubIcon size={16} /> Install app
        </a>
      ) : (
        <span className="text-muted text-small">Not configured on this server (GITHUB_APP_SLUG).</span>
      ),
    },
  ]

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`avatar ${styles.avatar}`} src={user.avatar_url} alt={user.login} width={296} height={296} />
        <div className={styles.names}>
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.login}>{user.login}</p>
        </div>
        {user.bio && <p className={styles.bio}>{user.bio}</p>}
        <div className={styles.sideActions}>
          <a className="btn btn-block" href={user.html_url} target="_blank" rel="noreferrer">
            <MarkGithubIcon size={16} /> View on GitHub
          </a>
          {box.exists && (
            <a className="btn btn-block" href={box.htmlUrl} target="_blank" rel="noreferrer">
              <RepoIcon size={16} /> {BOX_REPO}
            </a>
          )}
        </div>
        <ul className={styles.stats}>
          <li>
            <PackageIcon size={16} />
            <b>{opened.length}</b> {opened.length === 1 ? 'gift' : 'gifts'} kept
          </li>
          <li>
            {canReceive ? (
              <>
                <CheckCircleFillIcon size={16} className={styles.ok} /> Receiving gifts
              </>
            ) : (
              <>
                <AlertIcon size={16} /> Not receiving gifts yet
              </>
            )}
          </li>
        </ul>
      </aside>

      <div className={styles.content}>
        {needsReauth && (
          <div className="flash flash-warn">
            <AlertIcon size={16} />
            <div className={styles.flashBody}>
              <p>Your GitHub session has expired or is from an older version of GitGift.</p>
              <SignInButton>Sign in again</SignInButton>
            </div>
          </div>
        )}

        {!canReceive && !isThisMe && (
          <div className={`box ${styles.blankslate}`}>
            <span className={styles.blankIcon}>
              <GiftIcon size={24} />
            </span>
            <h2>
              {box.exists ? `${name}'s box can't receive gifts yet` : `${name} doesn't have a GitGiftBOX yet`}
            </h2>
            <p className="text-muted">
              {box.exists
                ? 'Issues are turned off on their GitGiftBOX, so there is nowhere for a gift to land.'
                : 'A gift needs a box to arrive in. GitGift never contacts people on your behalf.'}
            </p>
            <ShareBoxLink to={user.login} />
            {!viewerLogin && (
              <p className={`text-muted text-small ${styles.ownerHint}`}>
                Are you @{user.login}? <SignInButton className={styles.inlineSignIn}>Sign in to set up your box</SignInButton>
              </p>
            )}
          </div>
        )}

        {isThisMe && !needsReauth && (!repoReady || !connected) && (
          <section className="box" aria-labelledby="setup">
            <div className="box-header">
              <h2 id="setup" className="box-title">
                <PackageIcon size={16} /> Set up your GitGiftBOX
              </h2>
              <span className="counter">
                {setupSteps.filter((step) => step.done).length} / {setupSteps.length}
              </span>
            </div>
            <ol className={styles.setup}>
              {setupSteps.map((step, index) => (
                <li key={index} className={`box-row ${styles.setupRow}`}>
                  {step.done ? (
                    <CheckCircleFillIcon size={24} className={styles.ok} />
                  ) : (
                    <span className={styles.stepNumber}>{index + 1}</span>
                  )}
                  <div className={styles.setupText}>
                    <p className={step.done ? styles.doneTitle : styles.setupTitle}>{step.title}</p>
                    {!step.done && <p className="text-muted text-small">{step.detail}</p>}
                  </div>
                  {!step.done && <div>{step.action}</div>}
                </li>
              ))}
            </ol>
            <p className={`text-muted text-small ${styles.setupFooter}`}>Reload this page after each step.</p>
          </section>
        )}

        {canReceive && !isThisMe && !needsReauth && (
          viewerLogin ? (
            <SendGiftForm to={user.login} viewerAvatar={session?.user?.image ?? null} viewerLogin={viewerLogin} />
          ) : (
            <div className={`box ${styles.blankslate}`}>
              <span className={styles.blankIcon}>
                <GiftIcon size={24} />
              </span>
              <h2>Send {name} a gift</h2>
              <p className="text-muted">Sign in with GitHub so {name} knows the message really comes from you.</p>
              <SignInButton primary />
            </div>
          )
        )}

        {isThisMe && connected && (
          <PendingGifts
            gifts={pending
              // The Issue list can lag behind a just-opened gift; the README is the source of truth.
              .filter((gift) => !opened.some((row) => row.issueUrl === gift.htmlUrl))
              .map(({ number, from, createdAt, message }) => ({ number, from, createdAt, message }))}
          />
        )}

        {box.exists && (
          <section className="box" aria-labelledby="kept">
            <div className="box-header">
              <h2 id="kept" className="box-title">
                <RepoIcon size={16} />
                <a href={box.htmlUrl} target="_blank" rel="noreferrer" className={styles.repoLink}>
                  {user.login} / {BOX_REPO}
                </a>
              </h2>
              <span className="counter">{opened.length}</span>
            </div>
            {opened.length === 0 ? (
              <div className={styles.emptyRow}>
                <p className="text-muted">No gifts kept yet.</p>
              </div>
            ) : (
              <ul className={styles.timeline}>
                {[...opened].reverse().map((gift, index) => {
                  const number = issueNumber(gift.issueUrl)
                  return (
                    <li key={gift.issueUrl ?? index} className={`box-row ${styles.gift}`}>
                      <Link href={`/${gift.from}`} className={styles.giftAvatar}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="avatar"
                          src={`https://github.com/${gift.from}.png?size=80`}
                          alt={gift.from}
                          width={40}
                          height={40}
                        />
                      </Link>
                      <div className={styles.giftBody}>
                        <p className={styles.giftMessage}>{gift.message}</p>
                        <p className="text-muted text-small">
                          <Link href={`/${gift.from}`} className={styles.author}>
                            {gift.from}
                          </Link>{' '}
                          committed on {gift.date}
                        </p>
                      </div>
                      {gift.issueUrl && number && (
                        <a className="label" href={gift.issueUrl} target="_blank" rel="noreferrer" title="Original Issue">
                          <IssueClosedIcon size={12} className={styles.closed} />#{number}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
