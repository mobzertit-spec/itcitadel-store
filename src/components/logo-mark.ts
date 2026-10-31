/**
 * The ITCITADEL mark's drawing, shared by the Logo component and scripts/brand.ts (favicon, app icons, share image,
 * brand files): the C of the initials turned into an arched gate, the I an orange light standing in its doorway.
 */
export const MARK = {
  viewBox: '12 12 40 42',
  arch: 'M12 54V32a20 20 0 0 1 40 0v22h-9V32a11 11 0 0 0-22 0v22z',
  light: { x: 28, y: 28, width: 8, height: 26 },
  orange: '#ff6a00',
} as const

/** The mark as standalone SVG markup: the arch in `color`, the light in orange (or `lightColor`). */
export function markSvg(color: string, attrs = '', lightColor: string = MARK.orange) {
  const { x, y, width, height } = MARK.light
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}"${attrs ? ` ${attrs}` : ''}>` +
    `<path fill="${color}" d="${MARK.arch}"/><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${lightColor}"/></svg>`
  )
}
