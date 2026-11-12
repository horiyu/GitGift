// Server-side only. Shared pieces of the Open Graph images (app/opengraph-image.tsx and
// app/[user]/opengraph-image.tsx).
//
// The layout follows GitHub's repository cards: a white canvas, an "owner/repo" style title in
// bold type, a one-line description, a row of stats with Octicons, the owner's avatar on the
// right and a thin colour bar along the bottom. Text is English: link previews are fetched by
// crawlers, which do not carry the viewer's language.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import Mark from '@/components/Logo/Mark'

export const OG_SIZE = { width: 1200, height: 630 }

export const OG_COLORS = {
  fg: '#1f2328',
  muted: '#59636e',
  // GitGift's brand gradient, shown as segments like GitHub's language bar.
  brand: ['#bf3989', '#8250df', '#0969da'],
}

const FONT_DIR = join(process.cwd(), 'node_modules/@fontsource/mona-sans/files')

type Font = { name: string; data: Buffer; weight: 400 | 600 | 700; style: 'normal' }
let fonts: Promise<Font[]> | null = null

// Mona Sans (GitHub's open-source typeface, SIL OFL 1.1) from @fontsource/mona-sans.
export function ogFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    ([400, 600, 700] as const).map(async (weight) => ({
      name: 'Mona Sans',
      data: await readFile(join(FONT_DIR, `mona-sans-latin-${weight}-normal.woff`)),
      weight,
      style: 'normal' as const,
    })),
  )
  return fonts
}

// Octicons path data (16px grid), drawn inline because the image renderer only understands plain SVG.
const ICONS = {
  gift: 'M2 2.75A2.75 2.75 0 0 1 4.75 0c.983 0 1.873.42 2.57 1.232.268.318.497.668.68 1.042.183-.375.411-.725.68-1.044C9.376.42 10.266 0 11.25 0a2.75 2.75 0 0 1 2.45 4h.55c.966 0 1.75.784 1.75 1.75v2c0 .698-.409 1.301-1 1.582v4.918A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V9.332C.409 9.05 0 8.448 0 7.75v-2C0 4.784.784 4 1.75 4h.55c-.192-.375-.3-.8-.3-1.25ZM7.25 9.5H2.5v4.75c0 .138.112.25.25.25h4.5Zm1.5 0v5h4.5a.25.25 0 0 0 .25-.25V9.5Zm0-4V8h5.5a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25Zm-7 0a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h5.5V5.5h-5.5Zm3-4a1.25 1.25 0 0 0 0 2.5h2.309c-.233-.818-.542-1.401-.878-1.793-.43-.502-.915-.707-1.431-.707ZM8.941 4h2.309a1.25 1.25 0 0 0 0-2.5c-.516 0-1 .205-1.43.707-.337.392-.646.975-.879 1.793Z',
  issueOpened: 'M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z',
  package: 'm8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z',
  gitCommit: 'M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z',
  checkCircle: 'M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z',
  repo: 'M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z',
}

export function OgIcon({ name, size = 32, color = OG_COLORS.muted }: { name: keyof typeof ICONS; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d={ICONS[name]} fillRule="evenodd" />
    </svg>
  )
}

// GitGift's mark: the gift-commit glyph in a gradient badge (same as components/Logo).
export function OgLogo({ size }: { size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: `linear-gradient(135deg, ${OG_COLORS.brand.join(', ')})`,
      }}
    >
      <Mark size={Math.round(size * 0.66)} color="#ffffff" />
    </div>
  )
}

export function OgStat({ icon, value, label }: { icon: keyof typeof ICONS; value?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <OgIcon name={icon} size={34} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        {value && <span style={{ fontSize: 34, fontWeight: 600, color: OG_COLORS.fg }}>{value}</span>}
        <span style={{ fontSize: 26, color: OG_COLORS.muted }}>{label}</span>
      </div>
    </div>
  )
}

// White card with GitGift's brand row, a content area and the colour bar along the bottom.
export function OgCard({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#ffffff',
        color: OG_COLORS.fg,
        fontFamily: 'Mona Sans',
      }}
    >
      <div style={{ display: 'flex', flex: 1, padding: '72px 80px 0', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</div>
        <div style={{ display: 'flex' }}>{aside}</div>
      </div>
      <div style={{ display: 'flex', height: 16 }}>
        <div style={{ flex: 3, background: OG_COLORS.brand[0] }} />
        <div style={{ flex: 4, background: OG_COLORS.brand[1] }} />
        <div style={{ flex: 3, background: OG_COLORS.brand[2] }} />
      </div>
    </div>
  )
}

export function OgBrand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, color: OG_COLORS.muted }}>
      <OgLogo size={36} />
      <span style={{ fontWeight: 600, color: OG_COLORS.fg }}>GitGift</span>
    </div>
  )
}
