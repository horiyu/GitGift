// GitGift's glyph: GitHub's git-commit icon whose node is a wrapped present
// (lid, box, ribbon and bow), i.e. "a gift committed to Git".
// Plain SVG with explicit attributes so it renders both in the app and in next/og (Satori).

const PATHS = [
  // Commit line on either side of the node.
  'M0.75 16.5h4.5M18.75 16.5h4.5',
  // Lid.
  'M5 8.5h14a1.25 1.25 0 0 1 1.25 1.25v1.5A1.25 1.25 0 0 1 19 12.5H5a1.25 1.25 0 0 1-1.25-1.25v-1.5A1.25 1.25 0 0 1 5 8.5Z',
  // Box and the ribbon down its middle.
  'M5.25 12.5v6.75a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V12.5M12 8.5v12.25',
  // Bow.
  'M12 8.5c-1.84-3.8-6.04-4.72-6.04-2.19 0 1.84 3.16 2.19 6.04 2.19M12 8.5c1.84-3.8 6.04-4.72 6.04-2.19 0 1.84-3.16 2.19-6.04 2.19',
]

export default function Mark({ size, color = 'currentColor' }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {PATHS.map((d) => (
        <path key={d} d={d} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
