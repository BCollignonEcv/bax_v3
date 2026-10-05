// Génère les icônes PWA / iOS à partir d'un SVG dessiné à la main
// (lettres « BAX » en tracés, pour ne pas dépendre d'une police au rendu).
// Usage : npm run icons
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const INK = '#1F1A16'
const CREAM = '#F4EDE3'
const BLUE = '#5B82F0'
const ORANGE = '#F08A2E'

// Lettres sur une hauteur de 100 unités
const B =
  'M0 0H44C66 0 78 11 78 26C78 37 72 44 63 47C75 50 82 59 82 72C82 89 69 100 47 100H0Z' +
  'M24 19V40H42C50 40 54 36 54 29.5C54 23 50 19 42 19Z' +
  'M24 58V81H44C53 81 57 77 57 69.5C57 62 53 58 44 58Z'
const A = 'M0 100L30 0H58L88 100H62L56.5 80H31.5L26 100Z M36.5 62H51.5L44 34Z'
const X = 'M0 0H28L42 30L56 0H84L57 49L86 100H58L42 68L26 100H-2L27 49Z'

function mark({ size, bleed, padding, rounded }) {
  // Le mot fait 264 × 100 unités, les pastilles se placent au-dessus.
  const inner = size * (1 - padding * 2)
  const scale = inner / 264
  const wordH = 100 * scale
  const dotR = 15 * scale
  const totalH = wordH + dotR * 2 + 18 * scale
  const x0 = (size - 264 * scale) / 2
  const y0 = (size - totalH) / 2 + dotR * 2 + 18 * scale
  const cx = size / 2
  const cy = y0 - 18 * scale - dotR
  const radius = rounded ? size * 0.225 : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${bleed ? 0 : radius}" fill="${INK}"/>
  <g transform="translate(${x0} ${y0}) scale(${scale})" fill="${CREAM}" fill-rule="evenodd">
    <path d="${B}"/>
    <path transform="translate(88 0)" d="${A}"/>
    <path transform="translate(180 0)" d="${X}"/>
  </g>
  <circle cx="${cx - dotR * 0.55}" cy="${cy}" r="${dotR}" fill="${BLUE}"/>
  <circle cx="${cx + dotR * 0.55}" cy="${cy}" r="${dotR}" fill="${ORANGE}"/>
</svg>`
}

await mkdir('public', { recursive: true })

const targets = [
  // nom, taille, plein cadre (iOS / maskable), marge
  ['pwa-192x192.png', 192, true, 0.17],
  ['pwa-512x512.png', 512, true, 0.17],
  ['maskable-icon-512x512.png', 512, true, 0.25],
  ['apple-touch-icon-180x180.png', 180, true, 0.17],
  ['favicon-64x64.png', 64, false, 0.14],
]

for (const [name, size, bleed, padding] of targets) {
  const svg = mark({ size, bleed, padding, rounded: !bleed })
  await sharp(Buffer.from(svg)).png().toFile(`public/${name}`)
  console.log('✓', name)
}

await writeFile('public/favicon.svg', mark({ size: 512, bleed: false, padding: 0.14, rounded: true }))
await writeFile('public/icon.svg', mark({ size: 512, bleed: false, padding: 0.17, rounded: true }))
console.log('✓ favicon.svg, icon.svg')
