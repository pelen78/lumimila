import test from 'node:test';
import assert from 'node:assert/strict';
import { sheetPositions, cropMarks, CARD_MM, SHEET_MM, fitName, unsupportedCharacters, cleanName, validateSettings, sheetPdf } from '../dist/cards/core.mjs';

test('twelve 60 mm cards fit letter paper with print margins and no overlap', () => {
  const cards = sheetPositions();
  assert.equal(cards.length, 12);
  for (const r of cards) {
    assert.equal(r.width, 60); assert.equal(r.height, 60);
    assert.ok(r.x >= 12 && r.y >= 12);
    assert.ok(r.x + CARD_MM <= SHEET_MM.width - 12);
    assert.ok(r.y + CARD_MM <= SHEET_MM.height - 12);
    for (const other of cards) if (other !== r) assert.ok(r.x + r.width <= other.x || other.x + other.width <= r.x || r.y + r.height <= other.y || other.y + other.height <= r.y);
  }
  for (const [x1,y1,x2,y2] of cropMarks()) {
    assert.ok(Math.min(x1,x2,y1,y2) > 0);
    assert.ok(Math.max(x1,x2) < SHEET_MM.width && Math.max(y1,y2) < SHEET_MM.height);
  }
});
test('names with accents and long unbroken names fit within the printable text area', () => {
  const measure = (text, size) => Array.from(text).length * size * .66;
  for (const name of ['Sofía', 'María José Fernández', 'Á'.repeat(50), 'Maximiliano Sebastián de la Cruz']) {
    const result = fitName(name, measure, { width: 600, height: 300, maxFont: 145 });
    assert.ok(result.lines.length <= 2);
    assert.equal(result.lines.join('').replaceAll(' ', ''), name.replaceAll(' ', ''));
    assert.ok(result.lines.every(line => measure(line, result.size) <= 600));
    assert.ok(result.lines.length * result.lineHeight <= 300);
  }
});
test('corrupted saved settings recover without untrusted style values', () => {
  assert.equal(validateSettings(null).name, '');
  assert.deepEqual(validateSettings({name:' María  José ',font:'unknown',color:'url(evil)'}), {name:'María José',font:'night',color:'#513068',shadow:false,size:100});
  assert.equal(validateSettings({name:'X'.repeat(200)}).name.length, 50);
  assert.equal(validateSettings({shadow:true}).shadow, true);
  assert.equal(validateSettings({shadow:'false'}).shadow, false);
  assert.equal(validateSettings({size:Infinity}).size, 100);
  assert.equal(validateSettings({size:999}).size, 180);
  assert.equal(validateSettings({size:-100}).size, 60);
  assert.equal(validateSettings({size:135}).size, 135);
});
test('PDF uses exact letter dimensions and 12 physical 6 cm placements', () => {
  const bytes = sheetPdf(new Uint8Array([255,216,255,217]), 1254, 1254), source = new TextDecoder().decode(bytes);
  assert.match(source, /\/MediaBox \[0 0 612 792\]/);
  assert.equal((source.match(/\/Im0 Do/g) || []).length, 12);
  assert.equal((source.match(/170\.07874 0 0 170\.07874/g) || []).length, 12);
  assert.match(source, /\/PrintScaling \/None/);
  const xref = Number(source.match(/startxref\n(\d+)/)[1]);
  assert.equal(new TextDecoder().decode(bytes.slice(xref, xref+4)), 'xref');
});

test('name normalization preserves accents and coverage blocks unsupported glyphs', () => {
  for (const id of ['night', 'infectious', 'witchat']) {
    assert.deepEqual(unsupportedCharacters('María Muñoz', id), ['í', 'ñ']);
    assert.deepEqual(unsupportedCharacters('Sofia', id), []);
    assert.deepEqual(unsupportedCharacters('áéíóúÁÉÍÓÚñÑ', id), Array.from('áéíóúÁÉÍÓÚñÑ'));
  }
  assert.equal(cleanName('In\u0303igo'), 'Iñigo');
  assert.deepEqual(unsupportedCharacters('In\u0303igo', 'night'), ['ñ']);
  assert.deepEqual(unsupportedCharacters('名字', 'night'), ['名', '字']);
});
