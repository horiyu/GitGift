import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isValidLogin } from '@/lib/gift'
import { errorStatus, getBox, getOpenedGifts, getPendingGifts, publicOctokit } from '@/lib/github'
import { SignInButton, SignOutButton } from '@/components/Button/AuthButtons'
import BoxButton from '@/components/Gift/BoxButton'
import PendingGifts from '@/components/Gift/PendingGifts'
import SendGiftForm from '@/components/Gift/SendGiftForm'
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

export default async function UserPage({ params }: { params: { user: string } }) {
  const login = decodeURIComponent(params.user)
  if (!isValidLogin(login)) notFound()

  const [user, session] = await Promise.all([getUser(login), getServerSession(authOptions)])
  if (!user) notFound()

  const octokit = publicOctokit()
  const box = await getBox(octokit, user.login)
  const viewer = session?.user?.login
  const isThisMe = !!viewer && viewer.toLowerCase() === user.login.toLowerCase()
  const name = user.name || user.login

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

      {!box.exists && (
        <>
          <p>
            <b>{isThisMe ? 'You' : name}</b> {isThisMe ? "don't" : "doesn't"} have a GitGiftBOX yet.
          </p>
          {isThisMe && <BoxButton label="GET GitGiftBOX" />}
        </>
      )}

      {box.exists && !box.hasIssues && (
        <>
          <p>This GitGiftBOX cannot receive gifts yet because Issues are disabled.</p>
          {isThisMe && <BoxButton label="Enable receiving gifts" />}
        </>
      )}

      {box.exists && box.hasIssues && !isThisMe && (
        viewer ? (
          <SendGiftForm to={user.login} />
        ) : (
          <div className={styles.signIn}>
            <p>Sign in with GitHub to send a gift to {name}.</p>
            <SignInButton />
          </div>
        )
      )}

      {isThisMe && box.exists && (
        <PendingGifts
          gifts={pending
            // The Issue list can lag behind a just-opened gift; the README is the source of truth.
            .filter((gift) => !opened.some((row) => row.issueUrl === gift.htmlUrl))
            .map(({ number, from, createdAt }) => ({ number, from, createdAt }))}
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
