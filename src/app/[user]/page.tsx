import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
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
import { SignInButton, SignOutButton } from '@/components/Button/AuthButtons'
import PendingGifts from '@/components/Gift/PendingGifts'
import SendGiftForm from '@/components/Gift/SendGiftForm'
import ShareBoxLink from '@/components/Gift/ShareBoxLink'
import giftStyles from '@/components/Gift/gift.module.css'
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

  return (
    <div className={styles.main}>
      <div className={styles.profile}>
        <Link href={user.html_url}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.icon} src={user.avatar_url} alt={user.login} width={150} height={150} />
          <h1>{name}</h1>
          <p className={styles.login}>@{user.login}</p>
        </Link>
      </div>

      {needsReauth && (
        <div className={styles.signIn}>
          <p>Your GitHub session has expired or is from an older version of GitGift.</p>
          <SignInButton>Sign in again</SignInButton>
        </div>
      )}

      {!canReceive && !isThisMe && (
        <section className={giftStyles.section}>
          <p>
            {box.exists ? (
              <>
                <b>{name}</b>&apos;s GitGiftBOX can&apos;t receive gifts yet (Issues are turned off).
              </>
            ) : (
              <>
                <b>{name}</b> doesn&apos;t have a GitGiftBOX yet.
              </>
            )}
          </p>
          <ShareBoxLink to={user.login} />
          {!viewerLogin && (
            <div className={`${styles.signIn} ${giftStyles.spaced}`}>
              <p className={giftStyles.date}>Are you @{user.login}? Sign in to set up your box.</p>
              <SignInButton />
            </div>
          )}
        </section>
      )}

      {isThisMe && !needsReauth && (!box.exists || !box.hasIssues || !connected) && (
        <section className={giftStyles.section}>
          <h2>Set up your GitGiftBOX</h2>
          <ol className={giftStyles.steps}>
            <li>
              {box.exists ? (
                box.hasIssues ? (
                  <>✅ {BOX_REPO} repository exists</>
                ) : (
                  <>
                    Enable Issues in your box&apos;s{' '}
                    <a href={`${box.htmlUrl}/settings`} target="_blank" rel="noreferrer">
                      settings
                    </a>{' '}
                    (gifts arrive as Issues)
                  </>
                )
              ) : (
                <>
                  <a href={NEW_BOX_URL} target="_blank" rel="noreferrer">
                    Create a public repository named {BOX_REPO}
                  </a>
                </>
              )}
            </li>
            <li>
              {connected ? (
                <>✅ GitGift app installed</>
              ) : installUrl ? (
                <>
                  <a href={installUrl} target="_blank" rel="noreferrer">
                    Install the GitGift app
                  </a>{' '}
                  and choose <b>Only select repositories → {BOX_REPO}</b>
                </>
              ) : (
                <>GitGift app is not configured on this server (GITHUB_APP_SLUG).</>
              )}
            </li>
          </ol>
          <p className={giftStyles.date}>Reload this page after each step.</p>
        </section>
      )}

      {canReceive && !isThisMe && !needsReauth && (
        viewerLogin ? (
          <SendGiftForm to={user.login} />
        ) : (
          <div className={styles.signIn}>
            <p>Sign in with GitHub to send a gift to {name}.</p>
            <SignInButton />
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
        <section className={giftStyles.section}>
          <h2>
            <a href={box.htmlUrl}>GitGiftBOX</a> · {opened.length} {opened.length === 1 ? 'gift' : 'gifts'}
          </h2>
          {opened.length === 0 ? (
            <p className={giftStyles.date}>No gifts opened yet.</p>
          ) : (
            <ul className={giftStyles.list}>
              {[...opened].reverse().map((gift, index) => (
                <li key={gift.issueUrl ?? index} className={giftStyles.card}>
                  <p className={giftStyles.cardMessage}>{gift.message}</p>
                  <span className={giftStyles.date}>
                    from <Link href={`/${gift.from}`}>@{gift.from}</Link> · {gift.date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isThisMe && (
        <div className={styles.signOut}>
          <SignOutButton />
        </div>
      )}
    </div>
  )
}
