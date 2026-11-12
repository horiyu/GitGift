import Link from 'next/link'
import { getServerSession } from 'next-auth'
import {
  BookIcon,
  CheckCircleIcon,
  GitCommitIcon,
  IssueOpenedIcon,
  LockIcon,
  PackageIcon,
} from '@primer/octicons-react'
import { authOptions } from '@/lib/auth'
import { BOX_REPO } from '@/lib/gift'
import SearchBOX from '@/components/SearchBOX'
import { SignInButton } from '@/components/Button/AuthButtons'
import styles from './page.module.css'

const STEPS = [
  {
    icon: IssueOpenedIcon,
    tone: styles.toneSuccess,
    title: 'Wrap',
    text: 'You write a message. GitGift opens it as an Issue on their GitGiftBOX, signed by your GitHub account.',
  },
  {
    icon: PackageIcon,
    tone: styles.toneDone,
    title: 'Unwrap',
    text: 'They read it on GitGift, then decide whether to keep it. Nothing is published to their box without their say.',
  },
  {
    icon: GitCommitIcon,
    tone: styles.toneAccent,
    title: 'Commit',
    text: 'A kept gift becomes a row in their README, committed with you as the author. It stays in Git for good.',
  },
]

// Static sample of what a box README looks like after a few gifts.
const SAMPLE_ROWS = [
  { date: '2026-04-02', from: 'first-time-contributor', message: 'Your review on my first PR taught me more than any tutorial. Thank you!' },
  { date: '2026-07-19', from: 'a-teammate', message: 'Thanks for keeping the CI green all summer 🌱' },
  { date: '2026-11-11', from: 'co-maintainer', message: 'Happy 5 years of maintaining this project together.' },
]

export default async function Home() {
  const session = await getServerSession(authOptions)
  const login = session?.user?.login

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          <GitCommitIcon size={14} />
          Thank-you notes, committed to Git
        </span>
        <h1 className={styles.headline}>
          Say thanks where <span className={styles.gradient}>the work happens.</span>
        </h1>
        <p className={styles.lead}>
          Send a heartfelt message to any developer on GitHub. It arrives in their GitGiftBOX, and when they
          keep it, it is committed under your name.
        </p>
        <SearchBOX variant="hero" />
        <p className={styles.heroNote}>
          {login ? (
            <>
              Want to receive gifts? <Link href={`/${login}`}>Set up your own box →</Link>
            </>
          ) : (
            <>Sign in with GitHub to send a gift, or to set up your own box.</>
          )}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="how">
        <h2 id="how" className={styles.sectionTitle}>
          How a gift travels
        </h2>
        <ol className={styles.steps}>
          {STEPS.map(({ icon: Icon, tone, title, text }, index) => (
            <li key={title} className={`box ${styles.step}`}>
              <span className={`${styles.stepIcon} ${tone}`}>
                <Icon size={20} />
              </span>
              <span className={styles.stepNumber}>Step {index + 1}</span>
              <h3>{title}</h3>
              <p className="text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.split}`} aria-labelledby="box">
        <div className={styles.splitText}>
          <h2 id="box" className={styles.sectionTitle}>
            A box that lives in your profile
          </h2>
          <p className="text-muted">
            Your box is an ordinary public repository named <code>{BOX_REPO}</code>. Every gift you keep is a
            line in its README and a commit in its history, linked back to the Issue it came from.
          </p>
          <ul className={styles.points}>
            <li>
              <CheckCircleIcon size={16} />
              The sender is the Issue author recorded by GitHub, so it cannot be faked.
            </li>
            <li>
              <LockIcon size={16} />
              The GitGift app only gets access to your {BOX_REPO} repository.
            </li>
            <li>
              <CheckCircleIcon size={16} />
              You read every gift before it is committed, and can decline any of them.
            </li>
          </ul>
          {!session && <SignInButton primary large />}
        </div>

        <div className={`box ${styles.readme}`} aria-label="Example GitGiftBOX README">
          <div className="box-header">
            <span className="box-title">
              <BookIcon size={16} />
              README.md
            </span>
            <span className="text-muted text-small">you / {BOX_REPO}</span>
          </div>
          <div className={styles.readmeBody}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((row) => (
                  <tr key={row.date}>
                    <td className={styles.nowrap}>
                      <span className={styles.fakeLink}>{row.date}</span>
                    </td>
                    <td className={styles.nowrap}>
                      <span className={styles.fakeLink}>@{row.from}</span>
                    </td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
