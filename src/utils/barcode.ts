const CODE128_WIDTHS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
]

const escapeSvg = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const normalizeAscii = (value: string) => value.replace(/[^\x20-\x7e]/g, '').trim()
const normalizeNumeric = (value: string) => value.replace(/\D/g, '')

export function generateBarcodeValue(): string {
  const time = Date.now().toString().slice(-9)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${time}${random}`
}

function code128Values(value: string): { values: number[]; text: string } {
  const digits = normalizeNumeric(value)
  if (digits.length >= 4) {
    const text = digits.length % 2 === 0 ? digits : `0${digits}`
    const values = [105]
    for (let i = 0; i < text.length; i += 2) values.push(Number(text.slice(i, i + 2)))
    let checksum = values[0]
    for (let i = 1; i < values.length; i += 1) checksum += values[i] * i
    values.push(checksum % 103, 106)
    return { values, text }
  }

  const text = normalizeAscii(value)
  const values = [104]
  for (const char of text) values.push(char.charCodeAt(0) - 32)
  let checksum = values[0]
  for (let i = 1; i < values.length; i += 1) checksum += values[i] * i
  values.push(checksum % 103, 106)
  return { values, text }
}

export function barcodeSvg(value: string, width = 320, height = 100, showText = true): string {
  const { values, text } = code128Values(value)
  if (!text) return ''
  const quietZone = 24
  const barHeight = Math.max(35, height - (showText ? 30 : 8))
  const modules = values.reduce((sum, code) => sum + [...CODE128_WIDTHS[code]].reduce((a, b) => a + Number(b), 0), 0)
  const moduleWidth = Math.max(1, Math.floor((width - quietZone * 2) / modules))
  const usedWidth = modules * moduleWidth
  let x = Math.floor((width - usedWidth) / 2)
  const bars: string[] = []

  for (const code of values) {
    const widths = CODE128_WIDTHS[code]
    for (let i = 0; i < widths.length; i += 1) {
      const segmentWidth = Number(widths[i]) * moduleWidth
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="4" width="${segmentWidth}" height="${barHeight}" fill="#000"/>`)
      x += segmentWidth
    }
  }

  const label = showText ? `<text x="50%" y="${height - 5}" text-anchor="middle" font-family="monospace" font-size="11" fill="#111">${escapeSvg(text)}</text>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" shape-rendering="crispEdges" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/>${bars.join('')}${label}</svg>`
}

export function barcodeDataUri(value: string, width = 320, height = 100, showText = true): string {
  const svg = barcodeSvg(value, width, height, showText)
  return svg ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` : ''
}
