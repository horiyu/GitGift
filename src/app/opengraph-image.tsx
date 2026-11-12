import { ImageResponse } from 'next/og'
import { OG_COLORS, OG_SIZE, OgCard, OgLogo, OgStat, ogFonts } from '@/lib/og'

export const alt = 'GitGift: say thanks where the work happens.'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <OgCard aside={<OgLogo size={200} />}>
        <span style={{ fontSize: 30, color: OG_COLORS.muted }}>Thank-you notes for developers</span>
        <span style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, marginTop: 8 }}>GitGift</span>
        <span style={{ fontSize: 36, color: OG_COLORS.muted, lineHeight: 1.35, marginTop: 24, maxWidth: 760 }}>
          Say thanks where the work happens. Gifts arrive as GitHub Issues and are committed to Git.
        </span>
        <div style={{ display: 'flex', gap: 56, marginTop: 'auto', marginBottom: 56 }}>
          <OgStat icon="issueOpened" value="Wrap" label="as an Issue" />
          <OgStat icon="package" value="Unwrap" label="on GitGift" />
          <OgStat icon="gitCommit" value="Commit" label="to their README" />
        </div>
      </OgCard>
    ),
    { ...size, fonts: await ogFonts() },
  )
}
