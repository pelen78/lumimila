export const BUILTIN_FONTS = ['Fraunces', 'DM Sans', 'Georgia'];
export const MAX_FONT_BYTES = 5 * 1024 * 1024;
const MAX_FONTS = 30, MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const records = new Map(), faces = new Map();
let database;
export const isCustomFont = id => typeof id === 'string' && /^lumifont_[a-f0-9]{64}$/.test(id);
export const listFonts = () => [...records.values()].map(({data,...meta})=>meta);
export const fontInfo = id => records.get(id);

// Accept SFNT TrueType and OpenType files; reject malformed table directories.
export function inspectFont(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 28 || bytes.length > MAX_FONT_BYTES) throw new Error('La fuente debe ser un archivo TTF u OTF de hasta 5 MB.');
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const tag = String.fromCharCode(...bytes.subarray(0,4));
  const format = tag === 'OTTO' ? 'otf' : (view.getUint32(0) === 0x00010000 || tag === 'true') ? 'ttf' : null;
  const count = view.getUint16(4);
  if (!format || count < 1 || count > 256 || 12 + count * 16 > bytes.length) throw new Error('Este archivo no es una fuente TTF u OTF válida.');
  for(let i=0;i<count;i++){
    const offset=view.getUint32(12+i*16+8),length=view.getUint32(12+i*16+12);
    if(offset>bytes.length || length>bytes.length-offset)throw new Error('La fuente está incompleta o dañada.');
  }
  return format;
}
function base64(bytes){let value='';for(let i=0;i<bytes.length;i+=32768)value+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(value);}
function decode(data){
  if(typeof data!=='string'||data.length>Math.ceil(MAX_FONT_BYTES/3)*4+64||!/^data:font\/(ttf|otf);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)||data.split(',')[1].length%4!==0)throw new Error('La fuente incluida en el diseño no es válida.');
  return Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
}
async function fingerprint(bytes){return 'lumifont_'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function cleanName(name){return String(name||'Mi fuente').replace(/\.(ttf|otf)$/i,'').replace(/[\u0000-\u001f\u007f]/g,'').replace(/[_]+/g,' ').trim().slice(0,100)||'Mi fuente';}
export function validateFontRefs(raw=[]){
  if(!Array.isArray(raw)||raw.length>MAX_FONTS)throw new Error('Las fuentes de la plantilla no son válidas.');
  const seen=new Set();return raw.map(f=>{if(!f||!isCustomFont(f.id)||seen.has(f.id)||typeof f.name!=='string'||f.name.length>100)throw new Error('Las fuentes de la plantilla no son válidas.');seen.add(f.id);return {id:f.id,name:cleanName(f.name)};});
}
function openDatabase(){
  if(!database)database=new Promise((resolve,reject)=>{
    const req=indexedDB.open('lumimila-fonts-v1',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('fonts',{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('No se pudieron guardar las fuentes en este navegador.'));
    req.onblocked=()=>reject(new Error('Cierra otras pestañas de Lumimila y vuelve a intentar.'));
  }).catch(error=>{database=undefined;throw error;});
  return database;
}
async function loadFace(record,bytes){
  if(!faces.has(record.id)){
    const pending=(async()=>{const face=new FontFace(record.id,bytes);await face.load();document.fonts.add(face);return face;})();
    faces.set(record.id,pending);pending.catch(()=>faces.delete(record.id));
  }
  try{return await faces.get(record.id);}catch{throw new Error(`No se pudo abrir «${record.name}». Prueba otro archivo TTF u OTF.`);}
}
async function prepare(record){
  if(!record||!isCustomFont(record.id)||typeof record.name!=='string'||record.name.length>100)throw new Error('La fuente incluida no es válida.');
  const bytes=decode(record.data),format=inspectFont(bytes),id=await fingerprint(bytes);
  if(id!==record.id||!record.data.startsWith(`data:font/${format};`))throw new Error('La fuente incluida está dañada o no corresponde al diseño.');
  const safe={id,name:cleanName(record.name),format,data:record.data,byteLength:bytes.length};
  await loadFace(safe,bytes);return safe;
}
export async function initializeFonts(){
  const db=await openDatabase();const all=await new Promise((resolve,reject)=>{const r=db.transaction('fonts').objectStore('fonts').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const errors=[];for(const raw of all){try{const valid=await prepare(raw);records.set(valid.id,valid);}catch(e){errors.push(e.message);}}
  return errors;
}
async function persist(prepared){
  const additions=prepared.filter(f=>!records.has(f.id));
  if(records.size+additions.length>MAX_FONTS||[...records.values(),...additions].reduce((s,f)=>s+f.byteLength,0)>MAX_TOTAL_BYTES)throw new Error('Tu colección llegó al límite de 30 fuentes o 50 MB.');
  const db=await openDatabase();
  await new Promise((resolve,reject)=>{const tx=db.transaction('fonts','readwrite');for(const f of additions)tx.objectStore('fonts').put(f);tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('No hay espacio para guardar las fuentes. Libera espacio en el navegador y vuelve a intentar.'));tx.onabort=()=>reject(new Error('No se guardaron las fuentes. Vuelve a intentar.'));});
  for(const f of prepared)if(!records.has(f.id))records.set(f.id,f);
}
export async function uploadFont(file){
  if(!/\.(ttf|otf)$/i.test(file.name)||file.size>MAX_FONT_BYTES)throw new Error('Elige un archivo .TTF o .OTF de hasta 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),format=inspectFont(bytes),id=await fingerprint(bytes);
  if(records.has(id))return {record:records.get(id),duplicate:true};
  const record={id,name:cleanName(file.name),format,data:`data:font/${format};base64,${base64(bytes)}`,byteLength:bytes.length};
  await loadFace(record,bytes);await persist([record]);return {record,duplicate:false};
}
export function syncFontRefs(design){
  const names=new Map((design.fonts||[]).map(f=>[f.id,f.name]));
  design.fonts=[...new Set(design.elements.filter(e=>e.type==='text'&&isCustomFont(e.font)).map(e=>e.font))].map(id=>({id,name:records.get(id)?.name||names.get(id)||'Fuente personalizada'}));
}
export async function ensureDesignFonts(design){
  const texts=design.elements.filter(e=>e.type==='text');
  for(const id of new Set(texts.map(e=>e.font).filter(isCustomFont))){
    const record=records.get(id);
    if(!record)throw new Error(`Falta «${design.fonts?.find(f=>f.id===id)?.name||'una fuente'}». Vuelve a subirla en Mis fuentes o importa el diseño con sus fuentes.`);
    await loadFace(record,faces.has(id)?undefined:decode(record.data));
  }
  await Promise.all([...new Set(texts.map(e=>`${e.weight} 24px "${e.font}"`))].map(font=>document.fonts.load(font)));
}
export function exportFonts(design){return [...new Set(design.elements.filter(e=>e.type==='text'&&isCustomFont(e.font)).map(e=>e.font))].map(id=>{const record=records.get(id);if(!record)throw new Error('Falta una fuente. Vuelve a subirla antes de exportar el diseño.');return {...record};});}
export async function importFonts(raw,design){
  if(!Array.isArray(raw)||raw.length>MAX_FONTS)throw new Error('Las fuentes incluidas no son válidas.');
  const ids=new Set();for(const f of raw){if(!f||ids.has(f.id))throw new Error('El archivo contiene fuentes repetidas o inválidas.');ids.add(f.id);}
  const required=new Set(design.elements.filter(e=>e.type==='text'&&isCustomFont(e.font)).map(e=>e.font));
  for(const id of required)if(!ids.has(id))throw new Error('Este archivo no incluye todas las fuentes de la invitación.');
  if(raw.some(f=>!required.has(f.id)))throw new Error('El archivo incluye fuentes ajenas al diseño.');
  const prepared=[];for(const f of raw)prepared.push(await prepare(f));
  if(prepared.length)await persist(prepared);
}
