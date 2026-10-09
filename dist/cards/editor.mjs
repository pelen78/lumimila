import { DESIGNS, FONTS, COLORS, SHEET_MM, validateSettings, cleanName, unsupportedCharacters, fitName, sheetPositions, cropMarks, sheetPdf } from './core.mjs';

const $ = selector => document.querySelector(selector);
const storageKey = 'lumimila-tarjetas-v1';
let settings;
try { settings = validateSettings(JSON.parse(localStorage.getItem(storageKey))); } catch { settings = validateSettings(); }
let design = DESIGNS[0], version = 0, ready = false, view = 'card', canvas = null, downloadUrl = null;
const images = new Map(), fonts = new Map();
const editor = $('#card-editor'), nameInput = $('#card-name'), status = $('#card-status'), download = $('#card-download');
nameInput.value = settings.name;
$('#card-shadow').checked = settings.shadow;
$('#card-size').value = settings.size;

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(settings)); $('#card-save-note').textContent = 'Tu nombre y estilo se guardan en este navegador.'; }
  catch { $('#card-save-note').textContent = 'Puedes descargar tu tarjeta; el navegador no permite guardar los cambios.'; }
}
function clearDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null; $('#card-save-pdf').hidden = true;
}
function loadImage(item) {
  if (!images.has(item.id)) {
    const promise = new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img);
      img.onerror = () => { images.delete(item.id); reject(new Error('No pudimos cargar el diseño. Revisa tu conexión y vuelve a intentar.')); };
      img.src = item.image;
    });
    images.set(item.id, promise);
  }
  return images.get(item.id);
}
function loadFont(font) {
  if (!fonts.has(font.id)) {
    fonts.set(font.id, document.fonts.load(`400 100px "${font.family}"`).then(loaded => {
      if (!loaded.length) throw new Error('No pudimos cargar esa letra. Vuelve a intentar antes de descargar.');
    }).catch(error => { fonts.delete(font.id); throw error; }));
  }
  return fonts.get(font.id);
}
function drawCard(image, snapshot, font, item) {
  const result = document.createElement('canvas'); result.width = result.height = 1254;
  const ctx = result.getContext('2d'); ctx.drawImage(image, 0, 0, 1254, 1254);
  const zone = item.zone, name = snapshot.name || 'Tu nombre';
  const measure = (text, size) => {
    ctx.font = `400 ${size * (font.scale || 1)}px "${font.family}"`;
    const m = ctx.measureText(text);
    return Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0));
  };
  const layout = fitName(name, measure, { width: zone.w * 1254 - (snapshot.shadow ? 48 : 16), height: zone.h * 1254 - (snapshot.shadow ? 48 : 20), maxFont: Math.round(155 * snapshot.size / 100) });
  ctx.font = `400 ${layout.size * (font.scale || 1)}px "${font.family}"`; ctx.textAlign = 'center';
  ctx.fillStyle = snapshot.color; ctx.lineJoin = 'round';
  const centerX = (zone.x + zone.w / 2) * 1254, centerY = (zone.y + zone.h / 2) * 1254;
  layout.lines.forEach((line, i) => {
    const metrics = ctx.measureText(line);
    const y = centerY + (i - (layout.lines.length - 1) / 2) * layout.lineHeight + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    ctx.save();
    if (snapshot.shadow) {
      ctx.shadowColor = 'rgba(47, 20, 56, .55)'; ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 8; ctx.shadowOffsetY = 10;
    }
    if (snapshot.color === '#fff9ed' || snapshot.color === '#ffffff') {
      ctx.strokeStyle = '#513068'; ctx.lineWidth = 6; ctx.strokeText(line, centerX, y);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillText(line, centerX, y); ctx.restore();
  });
  return result;
}
function drawSheet(card) {
  const sheet = $('#card-sheet'), scale = 3;
  sheet.width = Math.round(SHEET_MM.width * scale); sheet.height = Math.round(SHEET_MM.height * scale);
  const ctx = sheet.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  for (const r of sheetPositions()) ctx.drawImage(card, r.x*scale, r.y*scale, r.width*scale, r.height*scale);
  ctx.strokeStyle = '#929292'; ctx.lineWidth = .5; ctx.beginPath();
  for (const [x1,y1,x2,y2] of cropMarks()) { ctx.moveTo(x1*scale,y1*scale); ctx.lineTo(x2*scale,y2*scale); }
  ctx.stroke();
}
function syncButtons() {
  $('[data-card-fonts]').querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.font === settings.font));
    const missing = unsupportedCharacters(settings.name, button.dataset.font);
    button.disabled = missing.length > 0;
    button.title = missing.length ? `Esta letra no incluye: ${missing.join(', ')}` : '';
  });
  $('[data-card-colors]').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === settings.color)));
  $('[data-card-designs]').querySelectorAll('a').forEach(link => {
    if (link.dataset.design === design.id) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
  });
  $('#card-size-value').textContent = `${settings.size}%`;
  $('#card-size').setAttribute('aria-valuetext', `${settings.size}%`);
  $('#card-character-count').textContent = `${Array.from(nameInput.value).length}/50`;
  $('#card-design-title').textContent = design.title;
}
async function render() {
  const missing = unsupportedCharacters(settings.name, settings.font);
  let fontNote = 'Estas versiones no incluyen acentos ni ñ.';
  if (missing.length) {
    const compatible = FONTS.find(font => !unsupportedCharacters(settings.name, font.id).length);
    if (compatible) {
      settings.font = compatible.id; save();
      fontNote = `Usamos ${compatible.label} para conservar todas las letras de tu nombre.`;
    } else fontNote = `Estas fuentes no incluyen: ${missing.join(', ')}. Necesitamos una fuente que incluya esos caracteres.`;
  }
  $('#card-font-note').textContent = fontNote;
  const token = ++version, snapshot = { ...settings }, item = design;
  ready = false; download.disabled = true; clearDownload(); syncButtons();
  $('#card-retry').hidden = true; editor.setAttribute('aria-busy', 'true'); status.textContent = 'Preparando tu tarjeta…';
  try {
    const font = FONTS.find(f => f.id === snapshot.font);
    const [image] = await Promise.all([loadImage(item), loadFont(font)]);
    if (token !== version) return;
    if (unsupportedCharacters(snapshot.name, font.id).length) {
      const preview = $('#card-preview'); preview.width = preview.height = 1254;
      preview.getContext('2d').drawImage(image, 0, 0, 1254, 1254); drawSheet(preview);
      preview.setAttribute('aria-label', `${item.title}. Escribe un nombre compatible con estas fuentes.`);
      status.textContent = 'Ese nombre contiene caracteres que estas letras no incluyen.';
      return;
    }
    canvas = drawCard(image, snapshot, font, item);
    const preview = $('#card-preview'); preview.width = preview.height = canvas.width;
    preview.getContext('2d').drawImage(canvas, 0, 0);
    preview.setAttribute('aria-label', `${item.title}. Nombre: ${snapshot.name || 'Tu nombre, ejemplo'}.`);
    drawSheet(canvas); ready = true;
    download.disabled = !snapshot.name;
    status.textContent = snapshot.name ? 'Tu tarjeta está lista. El PDF tendrá 12 copias iguales.' : 'Escribe un nombre para preparar tu hoja.';
  } catch (error) {
    if (token !== version) return;
    status.textContent = error.message; $('#card-retry').hidden = false;
  } finally { if (token === version) editor.setAttribute('aria-busy', 'false'); }
}

for (const font of FONTS) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.font = font.id;
  button.innerHTML = '<span class="card-font-sample" aria-hidden="true">Boo!</span><span class="card-font-label"></span><span class="card-font-support"></span>';
  button.firstChild.style.fontFamily = `"${font.family}"`;
  button.querySelector('.card-font-label').textContent = font.label;
  button.lastChild.textContent = font.spanish ? 'Acentos y ñ ✓' : 'Sin acentos ni ñ';
  button.setAttribute('aria-label', `Letra ${font.label}`);
  button.addEventListener('click', () => { settings.font = font.id; save(); render(); });
  $('[data-card-fonts]').append(button);
}
for (const color of COLORS) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.color = color.value;
  button.style.setProperty('--swatch', color.value); button.setAttribute('aria-label', `Color ${color.label}`); button.title = color.label;
  button.innerHTML = '<span aria-hidden="true">✓</span>';
  button.addEventListener('click', () => { settings.color = color.value; save(); render(); });
  $('[data-card-colors]').append(button);
}
for (const item of DESIGNS) {
  const link = document.createElement('a'); link.href = `#tarjetas/${item.id}`; link.dataset.design = item.id;
  link.setAttribute('aria-label', `Diseño ${item.title}`);
  const img = document.createElement('img'); img.src = item.image; img.alt = ''; img.width = img.height = 1254; img.loading = 'lazy';
  link.append(img); $('[data-card-designs]').append(link);
}
nameInput.addEventListener('input', () => { settings.name = cleanName(nameInput.value); save(); render(); });
$('#card-size').addEventListener('input', event => { settings.size = Number(event.target.value); save(); render(); });
$('#card-shadow').addEventListener('change', event => { settings.shadow = event.target.checked; save(); render(); });
$('#card-retry').addEventListener('click', render);
document.querySelectorAll('[data-card-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.cardView;
  document.querySelectorAll('[data-card-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  $('#card-preview').hidden = view !== 'card'; $('#card-sheet').hidden = view !== 'sheet';
  $('#card-preview-caption').textContent = view === 'card' ? '6 × 6 cm · el nombre se ajusta solito' : 'Hoja carta · 12 tarjetas de 6 × 6 cm';
}));
download.addEventListener('click', async () => {
  if (!ready || !settings.name || !canvas) return;
  download.disabled = true;
  try {
    const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', .98).split(',')[1]), c => c.charCodeAt(0));
    const pdf = new Blob([sheetPdf(jpeg, canvas.width, canvas.height)], { type: 'application/pdf' });
    clearDownload(); downloadUrl = URL.createObjectURL(pdf);
    const link = $('#card-save-pdf'); link.href = downloadUrl;
    const slug = settings.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'personalizada';
    link.download = `lumimila-${design.id}-${slug.toLowerCase()}-carta.pdf`;
    link.hidden = false; link.click();
    status.textContent = 'PDF listo. Imprime en hoja carta a tamaño real (100%).';
  } catch { status.textContent = 'No pudimos preparar el PDF. Vuelve a intentar.'; }
  finally { download.disabled = !ready || !settings.name; }
});
function onRoute() {
  const item = DESIGNS.find(d => location.hash === `#tarjetas/${d.id}`);
  if (!item) { version++; ready = false; clearDownload(); return; }
  design = item; render();
}
addEventListener('hashchange', onRoute); onRoute();
