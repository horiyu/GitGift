import { ImageResponse } from 'next/og'
import Mark from '@/components/Logo/Mark'
import { OG_COLORS } from '@/lib/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Home-screen icon for iOS. Full-bleed: the system rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${OG_COLORS.brand[0]}, ${OG_COLORS.brand[1]} 55%, ${OG_COLORS.brand[2]})`,
        }}
      >
        <Mark size={120} color="#ffffff" />
      </div>
    ),
    size,
  )
}
