import { FONT_CHARACTERS } from './font-characters.mjs';
export const CARD_MM = 60;
export const SHEET_MM = { width: 215.9, height: 279.4 };
export const DESIGNS = [
  { id: 'vampirita', title: 'Dulce vampirita', image: './assets/cards/vampirita.png', zone: { x: .37, y: .285, w: .50, h: .32 } },
  { id: 'vampirito', title: 'Pequeño vampiro', image: './assets/cards/vampirito.png', zone: { x: .34, y: .29, w: .54, h: .32 } },
  { id: 'fantasmitas', title: 'Fantasmitas felices', image: './assets/cards/fantasmitas.png', zone: { x: .18, y: .31, w: .64, h: .30 } }
];
export const FONTS = [
  { id: 'night', family: 'Card Night', label: 'Night Halloween', spanish: false },
  { id: 'infectious', family: 'Card Infectious', label: 'Infectious Halloween', spanish: false },
  { id: 'witchat', family: 'Card Witchat', label: 'Witchat', spanish: false, scale: 1.6 }
];
export function unsupportedCharacters(name, fontId) {
  const available = FONT_CHARACTERS[fontId] || '';
  return [...new Set(Array.from(cleanName(name)).filter(char => char !== ' ' && !available.includes(char)))];
}
export const COLORS = [
  { value: '#513068', label: 'Morado' }, { value: '#08676b', label: 'Verde petróleo' },
  { value: '#a73345', label: 'Frambuesa' }, { value: '#583322', label: 'Chocolate' },
  { value: '#fff9ed', label: 'Crema' }, { value: '#000000', label: 'Negro' },
  { value: '#ffffff', label: 'Blanco' }
];
export function cleanName(value) {
  return Array.from(String(value ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 50).join('');
}
export function validateSettings(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  return {
    name: typeof value.name === 'string' ? cleanName(value.name) : '',
    font: FONTS.some(f => f.id === value.font) ? value.font : FONTS[0].id,
    color: COLORS.some(c => c.value === value.color) ? value.color : COLORS[0].value,
    shadow: value.shadow === true,
    size: typeof value.size === 'number' && Number.isFinite(value.size) ? Math.min(180, Math.max(60, Math.round(value.size / 5) * 5)) : 100
  };
}
// Positions are shared by the preview and PDF: 3 columns and 4 rows.
export function sheetPositions() {
  const gap = 3, x = (SHEET_MM.width - CARD_MM * 3 - gap * 2) / 2;
  const y = (SHEET_MM.height - CARD_MM * 4 - gap * 3) / 2;
  return Array.from({ length: 12 }, (_, i) => ({
    x: x + (i % 3) * (CARD_MM + gap),
    y: y + Math.floor(i / 3) * (CARD_MM + gap), width: CARD_MM, height: CARD_MM
  }));
}
export function cropMarks() {
  return sheetPositions().flatMap(r => {
    const lines = [];
    for (const [x, dx] of [[r.x, -1], [r.x + r.width, 1]]) {
      for (const [y, dy] of [[r.y, -1], [r.y + r.height, 1]]) {
        lines.push([x + dx * .5, y, x + dx * 2.5, y]);
        lines.push([x, y + dy * .5, x, y + dy * 2.5]);
      }
    }
    return lines;
  });
}
export function fitName(text, measure, box) {
  const name = cleanName(text), words = name.split(' '), candidates = [[name]];
  for (let i = 1; i < words.length; i++) candidates.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  // A single unbroken long name can also wrap instead of overflowing.
  if (words.length === 1 && Array.from(name).length > 14) {
    const chars = Array.from(name), mid = Math.ceil(chars.length / 2);
    candidates.push([chars.slice(0, mid).join(''), chars.slice(mid).join('')]);
  }
  const options = candidates.map(lines => {
    let size = box.maxFont;
    while (size > 8 && (Math.max(...lines.map(line => measure(line, size))) > box.width || lines.length * size * 1.25 > box.height)) size--;
    return { lines, size, lineHeight: size * 1.25 };
  });
  if (options[0].size >= box.maxFont * .76) return options[0];
  return options.reduce((best, item) => item.size > best.size ? item : best, options[0]);
}
export function sheetPdf(jpegBytes, imageWidth, imageHeight) {
  const enc = new TextEncoder(), chunks = [], offsets = [0]; let length = 0;
  const add = value => { const bytes = typeof value === 'string' ? enc.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const obj = (id, body) => { offsets[id] = length; add(`${id} 0 obj\n${body}\nendobj\n`); };
  const pt = mm => (mm * 72 / 25.4).toFixed(5);
  const commands = sheetPositions().map(r => `q ${pt(r.width)} 0 0 ${pt(r.height)} ${pt(r.x)} ${pt(SHEET_MM.height-r.y-r.height)} cm /Im0 Do Q`);
  commands.push('0.6 G 0.3 w');
  for (const [x1,y1,x2,y2] of cropMarks()) commands.push(`${pt(x1)} ${pt(SHEET_MM.height-y1)} m ${pt(x2)} ${pt(SHEET_MM.height-y2)} l S`);
  const content = commands.join('\n');
  add('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4] = length;
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  add(jpegBytes); add('\nendstream\nendobj\n');
  obj(5, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
  const xref = length;
  add('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) add(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const bytes = new Uint8Array(length); let start = 0;
  for (const chunk of chunks) { bytes.set(chunk, start); start += chunk.length; }
  return bytes;
}
