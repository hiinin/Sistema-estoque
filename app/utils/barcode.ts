/**
 * Gerador de Código de Barras Padrão Code 128 (Subtipo B) em SVG
 * 100% puro TypeScript, sem dependências externas.
 */

// Padrões de barras (1 = barra, 0 = espaço) para cada símbolo de 0 a 106
const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011' // 106 = STOP PATTERN (13 bits)
]

export function generateBarcodeSvg(
  text: string,
  options: {
    height?: number
    moduleWidth?: number
    includeText?: boolean
  } = {}
): string {
  const height = options.height || 50
  const moduleWidth = options.moduleWidth || 2
  const includeText = options.includeText !== false

  // Higieniza o texto para caracteres ASCII 32 a 126
  const clean = (text || '000000').replace(/[^\x20-\x7E]/g, '')
  if (!clean) return ''

  // Início Code 128 Subset B (código 104)
  const START_B = 104
  let checksum = START_B
  const symbols = [START_B]

  for (let i = 0; i < clean.length; i++) {
    const val = clean.charCodeAt(i) - 32
    symbols.push(val)
    checksum += val * (i + 1)
  }

  // Checksum modulo 103
  symbols.push(checksum % 103)
  // Símbolo STOP (106)
  symbols.push(106)

  // Monta padrão de bits
  let bitPattern = ''
  for (const sym of symbols) {
    bitPattern += CODE128_PATTERNS[sym] || ''
  }

  const quietZone = 10 // módulos de margem
  const totalWidth = (bitPattern.length + quietZone * 2) * moduleWidth
  const svgHeight = includeText ? height + 18 : height

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}" class="barcode-svg" style="display:inline-block;max-width:100%;height:auto;">`
  svg += `<rect width="${totalWidth}" height="${svgHeight}" fill="#FFFFFF"/>`

  let currentX = quietZone * moduleWidth
  for (let i = 0; i < bitPattern.length; i++) {
    if (bitPattern[i] === '1') {
      svg += `<rect x="${currentX}" y="0" width="${moduleWidth}" height="${height}" fill="#000000"/>`
    }
    currentX += moduleWidth
  }

  if (includeText) {
    svg += `<text x="${totalWidth / 2}" y="${height + 14}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">${clean}</text>`
  }

  svg += '</svg>'
  return svg
}
