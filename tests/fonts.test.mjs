import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectFont,MAX_FONT_BYTES,validateFontRefs,ensureDesignFonts,exportFonts,importFonts,syncFontRefs} from '../dist/estudio/fonts.mjs';
import {birthday,customerCopy,validateDesign,renderDesign} from '../dist/estudio/core.mjs';
const id='lumifont_'+'a'.repeat(64);
test('Real TTF files are accepted; invalid files and overflowing font tables are rejected',async()=>{
  const bytes=new Uint8Array(await readFile(new URL('../dist/estudio/assets/dm-sans.ttf',import.meta.url)));
  assert.equal(inspectFont(bytes),'ttf');
  assert.throws(()=>inspectFont(new TextEncoder().encode('This is not a font.')));
  const damaged=bytes.slice();new DataView(damaged.buffer).setUint32(20,0xffffffff);assert.throws(()=>inspectFont(damaged));
  assert.throws(()=>inspectFont(new Uint8Array(MAX_FONT_BYTES+1)));
});
test('OTF signatures and bounded directories are accepted for browser verification',()=>{
  const bytes=new Uint8Array(32);bytes.set(new TextEncoder().encode('OTTO'));const v=new DataView(bytes.buffer);v.setUint16(4,1);v.setUint32(20,28);v.setUint32(24,4);
  assert.equal(inspectFont(bytes),'otf');v.setUint32(24,5);assert.throws(()=>inspectFont(bytes));
});
test('Custom font references survive validation and independent customer copies',()=>{
  const design=birthday();design.fonts=[{id,name:'Mi caligrafía'}];design.elements[1].font=id;
  const valid=validateDesign(JSON.parse(JSON.stringify(design))),copy=customerCopy(valid);
  assert.equal(copy.elements[1].font,id);assert.deepEqual(copy.fonts,design.fonts);copy.fonts[0].name='Changed';assert.equal(valid.fonts[0].name,'Mi caligrafía');
  delete design.fonts;assert.throws(()=>validateDesign(design));
});
test('Arbitrary CSS font names and duplicate font references are rejected',()=>{
  assert.throws(()=>validateFontRefs([{id:'bad"; color:red',name:'Unsafe'}]));assert.throws(()=>validateFontRefs([{id,name:'A'},{id,name:'B'}]));
  const design=birthday();design.elements[1].font='Unregistered';assert.throws(()=>validateDesign(design));
});
test('Switching back to built-in fonts removes unused portable references',()=>{
  const d=birthday();d.fonts=[{id,name:'Mi fuente'}];d.elements[1].font=id;syncFontRefs(d);assert.equal(d.fonts[0].name,'Mi fuente');d.elements[1].font='Georgia';syncFontRefs(d);assert.deepEqual(d.fonts,[]);
});
test('Missing fonts stop export and rendering instead of silently using a fallback',async()=>{
  const d=birthday();d.fonts=[{id,name:'Mi fuente'}];d.elements[1].font=id;
  assert.throws(()=>exportFonts(d),/Falta una fuente/);
  await assert.rejects(ensureDesignFonts(d),/Falta «Mi fuente»/);
  let drawn=false;await assert.rejects(renderDesign({getContext(){drawn=true;}},d),/Falta/);assert.equal(drawn,false);
  await assert.rejects(importFonts([],d),/no incluye todas/);
});
test('All selected font weights finish loading before rendering can proceed',async()=>{
  const original=globalThis.document,calls=[];let release;
  globalThis.document={fonts:{load:font=>{calls.push(font);return new Promise(resolve=>{release=resolve;});}}};
  try{const promise=ensureDesignFonts({elements:[{type:'text',font:'Georgia',weight:650}]});let done=false;promise.then(()=>done=true);await Promise.resolve();assert.equal(done,false);assert.deepEqual(calls,['650 24px "Georgia"']);release([]);await promise;assert.equal(done,true);}finally{globalThis.document=original;}
});
test('Malformed portable font payloads cannot load remote URLs or impersonate another font',async()=>{
  const d=birthday();d.fonts=[{id,name:'Example'}];d.elements[1].font=id;
  await assert.rejects(importFonts([{id,name:'Example',data:'https://example.com/font.ttf'}],d),/no es válida/);
  const bytes=await readFile(new URL('../dist/estudio/assets/dm-sans.ttf',import.meta.url));
  await assert.rejects(importFonts([{id,name:'Example',data:'data:font/ttf;base64,'+bytes.toString('base64')}],d),/dañada/);
});
