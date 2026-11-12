import type { Metadata } from 'next'
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
  MegaphoneIcon,
  PackageIcon,
  RepoIcon,
} from '@primer/octicons-react'
import { authOptions } from '@/lib/auth'
import { BOX_REPO, isValidLogin } from '@/lib/gift'
import {
  NEW_BOX_URL,
  appInstallUrl,
  getPendingGifts,
  getBoxConnection,
  publicOctokit,
  viewerFromCookies,
} from '@/lib/github'
import { getPublicBox, getPublicHistory, getPublicUser } from '@/lib/public-data'
import { getTranslator } from '@/i18n/server'
import { rich } from '@/i18n/rich'
import { SignInButton } from '@/components/Button/AuthButtons'
import PendingGifts from '@/components/Gift/PendingGifts'
import SendGiftForm from '@/components/Gift/SendGiftForm'
import ShareButtons from '@/components/Gift/ShareButtons'
import styles from './user.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ user: string }> }

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

async function loginFrom(params: Props['params']): Promise<string> {
  const login = safeDecode((await params).user)
  if (!login || !isValidLogin(login)) notFound()
  return login
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const login = await loginFrom(params)
  const [user, { t }] = await Promise.all([getPublicUser(login), getTranslator()])
  if (!user) return {}
  const title = t('meta.userTitle', { name: user.name || user.login })
  const description = t('meta.userDescription', { login: user.login })
  return {
    title,
    description,
    alternates: { canonical: `/${user.login}` },
    openGraph: { title, description, url: `/${user.login}`, type: 'profile', siteName: 'GitGift' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function UserPage({ params }: Props) {
  const login = await loginFrom(params)

  const [user, session, { t, tp, date }] = await Promise.all([
    getPublicUser(login),
    getServerSession(authOptions),
    getTranslator(),
  ])
  if (!user) notFound()

  const viewerLogin = session?.user?.login ?? null
  const sessionExpired = !!session && !!session.user?.tokenExpired
  const isThisMe = !!viewerLogin && viewerLogin.toLowerCase() === user.login.toLowerCase()
  // Visitors get cached public data; the owner always sees the current state of their box.
  const fresh = isThisMe
  const box = await getPublicBox(user.login, { fresh })
  const name = user.name || user.login

  // Only the owner needs to know whether the GitGift app can act on the box.
  const viewer = isThisMe && box.exists && !sessionExpired ? await viewerFromCookies() : null
  const connection = viewer ? await getBoxConnection(viewer) : 'not-connected'
  const connected = connection === 'connected'
  const needsReauth = sessionExpired || connection === 'reauth'
  const installUrl = appInstallUrl()
  const canReceive = box.exists && box.hasIssues

  const [history, pending] = box.exists
    ? await Promise.all([
        getPublicHistory(user.login, { fresh }),
        isThisMe && box.hasIssues && connected ? getPendingGifts(publicOctokit(), user.login) : Promise.resolve([]),
      ])
    : [null, []]
  const opened = history?.gifts ?? []
  const bold = { b: (chunk: string) => <b>{chunk}</b> }

  const setupSteps = [
    {
      done: canReceive,
      title: box.exists && !box.hasIssues ? t('setup.issuesTitle') : t('setup.createTitle', { repo: BOX_REPO }),
      detail: box.exists && !box.hasIssues ? t('setup.issuesDetail') : t('setup.createDetail'),
      action: box.exists ? (
        !box.hasIssues && (
          <a className="btn" href={`${box.htmlUrl}/settings`} target="_blank" rel="noreferrer">
            {t('setup.issuesAction')} <LinkExternalIcon size={16} />
          </a>
        )
      ) : (
        <a className="btn btn-primary" href={NEW_BOX_URL} target="_blank" rel="noreferrer">
          <RepoIcon size={16} /> {t('setup.createAction')}
        </a>
      ),
    },
    {
      done: connected,
      title: t('setup.installTitle'),
      detail: rich(t('setup.installDetail', { repo: BOX_REPO }), bold),
      action: installUrl ? (
        <a className={`btn ${canReceive ? 'btn-primary' : ''}`} href={installUrl} target="_blank" rel="noreferrer">
          <MarkGithubIcon size={16} /> {t('setup.installAction')}
        </a>
      ) : (
        <span className="text-muted text-small">{t('setup.notConfigured')}</span>
      ),
    },
  ]

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`avatar ${styles.avatar}`} src={user.avatarUrl} alt={user.login} width={296} height={296} />
        <div className={styles.names}>
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.login}>{user.login}</p>
        </div>
        {user.bio && <p className={styles.bio}>{user.bio}</p>}
        <div className={styles.sideActions}>
          <a className="btn btn-block" href={user.htmlUrl} target="_blank" rel="noreferrer">
            <MarkGithubIcon size={16} /> {t('user.viewOnGitHub')}
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
            <span>{rich(tp('user.kept', opened.length), bold)}</span>
          </li>
          <li>
            {canReceive ? (
              <>
                <CheckCircleFillIcon size={16} className={styles.ok} /> {t('user.receiving')}
              </>
            ) : (
              <>
                <AlertIcon size={16} /> {t('user.notReceiving')}
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
              <p>{t('user.reauth')}</p>
              <SignInButton>{t('auth.signInAgain')}</SignInButton>
            </div>
          </div>
        )}

        {!canReceive && !isThisMe && (
          <>
            <div className={`box ${styles.blankslate}`}>
              <span className={styles.blankIcon}>
                <GiftIcon size={24} />
              </span>
              <h2>{box.exists ? t('user.issuesOffTitle', { name }) : t('user.noBoxTitle', { name })}</h2>
              <p className="text-muted">{box.exists ? t('user.issuesOffText') : t('user.noBoxText')}</p>
              <p className="text-muted text-small">{t('share.invite', { name })}</p>
              <ShareButtons path={`/${user.login}`} text={t('share.inviteText', { login: user.login })} />
              {!viewerLogin && (
                <p className={`text-muted text-small ${styles.ownerHint}`}>
                  {t('user.areYou', { login: user.login })}{' '}
                  <SignInButton className={styles.inlineSignIn}>{t('user.signInToSetUp')}</SignInButton>
                </p>
              )}
            </div>
            {/* The message waits in this browser until the box is ready. */}
            <SendGiftForm to={user.login} viewerLogin={viewerLogin} viewerAvatar={session?.user?.image ?? null} mode="draft" />
          </>
        )}

        {isThisMe && !needsReauth && (!canReceive || !connected) && (
          <section className="box" aria-labelledby="setup">
            <div className="box-header">
              <h2 id="setup" className="box-title">
                <PackageIcon size={16} /> {t('setup.title')}
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
            <p className={`text-muted text-small ${styles.setupFooter}`}>{t('setup.reload')}</p>
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
              <h2>{t('user.sendTitle', { name })}</h2>
              <p className="text-muted">{t('user.sendSignIn', { name })}</p>
              <SignInButton primary />
            </div>
          )
        )}

        {isThisMe && connected && (
          <PendingGifts
            gifts={pending
              // The Issue list can lag behind a just-opened gift; the README is the source of truth.
              .filter((gift) => !history?.recordedIssueUrls.includes(gift.htmlUrl))
              .map(({ number, from, createdAt, message }) => ({ number, from, createdAt, message }))}
          />
        )}

        {isThisMe && connected && canReceive && (
          <section className={`box ${styles.shareBox}`} aria-labelledby="share-box">
            <div className={styles.shareBoxText}>
              <h2 id="share-box" className="box-title">
                <MegaphoneIcon size={16} /> {t('shareBox.title')}
              </h2>
              <p className="text-muted text-small">{t('shareBox.text')}</p>
            </div>
            <ShareButtons path={`/${user.login}`} text={t('shareBox.post')} align="start" />
          </section>
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
            {history?.status === 'unavailable' ? (
              <div className={styles.emptyRow}>
                <p className="text-muted">{t('history.unavailable')}</p>
              </div>
            ) : opened.length === 0 ? (
              <div className={styles.emptyRow}>
                <p className="text-muted">{t('history.empty')}</p>
              </div>
            ) : (
              <ul className={styles.timeline}>
                {[...opened].reverse().map((gift) => (
                  <li key={gift.number} className={`box-row ${styles.gift}`}>
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
                        {rich(t('history.committed', { login: gift.from, date: date(gift.date) }), {
                          author: (chunk) => (
                            <Link href={`/${gift.from}`} className={styles.author}>
                              {chunk}
                            </Link>
                          ),
                        })}
                      </p>
                    </div>
                    <a className="label" href={gift.issueUrl} target="_blank" rel="noreferrer" title={t('history.originalIssue')}>
                      <IssueClosedIcon size={12} className={styles.closed} />#{gift.number}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {isThisMe && history?.status === 'ok' && history.unverifiedCount > 0 && (
              <p className={`text-muted text-small ${styles.setupFooter}`}>{tp('history.hidden', history.unverifiedCount)}</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
