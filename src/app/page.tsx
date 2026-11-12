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
import { getTranslator } from '@/i18n/server'
import { rich } from '@/i18n/rich'
import styles from './page.module.css'

const STEPS = [
  { icon: IssueOpenedIcon, tone: styles.toneSuccess, title: 'home.wrapTitle', text: 'home.wrapText' },
  { icon: PackageIcon, tone: styles.toneDone, title: 'home.unwrapTitle', text: 'home.unwrapText' },
  { icon: GitCommitIcon, tone: styles.toneAccent, title: 'home.commitTitle', text: 'home.commitText' },
] as const

// Static sample of what a box README looks like after a few gifts.
const SAMPLE_ROWS = [
  { date: '2026-04-02', from: 'first-time-contributor', message: 'home.sample1' },
  { date: '2026-07-19', from: 'a-teammate', message: 'home.sample2' },
  { date: '2026-11-11', from: 'co-maintainer', message: 'home.sample3' },
] as const

export default async function Home() {
  const [session, { t }] = await Promise.all([getServerSession(authOptions), getTranslator()])
  const login = session?.user?.login

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          <GitCommitIcon size={14} />
          {t('home.eyebrow')}
        </span>
        <h1 className={styles.headline}>
          {rich(t('home.headline'), { em: (chunk) => <span className={styles.gradient}>{chunk}</span> })}
        </h1>
        <p className={styles.lead}>{t('home.lead')}</p>
        <SearchBOX variant="hero" />
        <p className={styles.heroNote}>
          {login
            ? rich(t('home.noteSignedIn'), { link: (chunk) => <Link href={`/${login}`}>{chunk}</Link> })
            : t('home.noteSignedOut')}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="how">
        <h2 id="how" className={styles.sectionTitle}>
          {t('home.howTitle')}
        </h2>
        <ol className={styles.steps}>
          {STEPS.map(({ icon: Icon, tone, title, text }, index) => (
            <li key={title} className={`box ${styles.step}`}>
              <span className={`${styles.stepIcon} ${tone}`}>
                <Icon size={20} />
              </span>
              <span className={styles.stepNumber}>{t('home.step', { n: index + 1 })}</span>
              <h3>{t(title)}</h3>
              <p className="text-muted">{t(text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.split}`} aria-labelledby="box">
        <div className={styles.splitText}>
          <h2 id="box" className={styles.sectionTitle}>
            {t('home.boxTitle')}
          </h2>
          <p className="text-muted">
            {rich(t('home.boxText', { repo: BOX_REPO }), { code: (chunk) => <code>{chunk}</code> })}
          </p>
          <ul className={styles.points}>
            <li>
              <CheckCircleIcon size={16} />
              {t('home.point1')}
            </li>
            <li>
              <LockIcon size={16} />
              {t('home.point2', { repo: BOX_REPO })}
            </li>
            <li>
              <CheckCircleIcon size={16} />
              {t('home.point3')}
            </li>
          </ul>
          {!session && <SignInButton primary large />}
        </div>

        <div className={`box ${styles.readme}`} aria-label={t('home.sampleLabel')}>
          <div className="box-header">
            <span className="box-title">
              <BookIcon size={16} />
              README.md
            </span>
            <span className="text-muted text-small">{t('home.sampleOwner')} / {BOX_REPO}</span>
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
                    <td>{t(row.message)}</td>
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
