import { ImageResponse } from 'next/og'
import { BOX_REPO, isValidLogin } from '@/lib/gift'
import { OG_COLORS, OG_SIZE, OgBrand, OgCard, OgStat, ogFonts } from '@/lib/og'
import { getPublicBox, getPublicHistory, getPublicUser } from '@/lib/public-data'

export const alt = 'Send a thank-you on GitGift'
export const size = OG_SIZE
export const contentType = 'image/png'

// Laid out like a GitHub repository card for "<login>/GitGiftBOX".
// Uses the same cached public data as the profile page, so link previews add no GitHub API load.
export default async function Image({ params }: { params: Promise<{ user: string }> }) {
  const raw = (await params).user
  const user = isValidLogin(raw) ? await getPublicUser(raw) : null
  const login = user?.login ?? 'someone'
  const box = user ? await getPublicBox(user.login) : null
  const ready = !!box?.exists && box.hasIssues
  const history = user && box?.exists ? await getPublicHistory(user.login) : null
  const kept = history?.gifts.length ?? 0
  const titleSize = login.length > 14 ? 60 : 72

  return new ImageResponse(
    (
      <OgCard
        aside={
          user ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}s=400`}
              alt={user.login}
              width={200}
              height={200}
              style={{ borderRadius: 24 }}
            />
          ) : null
        }
      >
        <OgBrand />
        <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: titleSize, lineHeight: 1.1, letterSpacing: -1.5, marginTop: 40 }}>
          <span style={{ fontWeight: 400 }}>{login}/</span>
          <span style={{ fontWeight: 700 }}>{BOX_REPO}</span>
        </div>
        <span style={{ fontSize: 34, color: OG_COLORS.muted, lineHeight: 1.35, marginTop: 24, maxWidth: 760 }}>
          {ready
            ? `Send ${login} a thank-you note. Gifts they keep are committed to this box.`
            : `${login} doesn't have a GitGiftBOX yet. Help them set one up, then send a thank-you.`}
        </span>
        <div style={{ display: 'flex', gap: 56, marginTop: 'auto', marginBottom: 56 }}>
          <OgStat icon="gift" value={String(kept)} label={kept === 1 ? 'Gift kept' : 'Gifts kept'} />
          <OgStat icon={ready ? 'checkCircle' : 'repo'} value={ready ? 'Open' : 'Not set up'} label="for gifts" />
        </div>
      </OgCard>
    ),
    { ...size, fonts: await ogFonts() },
  )
}
