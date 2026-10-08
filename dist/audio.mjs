export const CLIP_SECONDS=15, SAMPLE_RATE=48000;
const MAX_WAV_BYTES=44+CLIP_SECONDS*SAMPLE_RATE*2;
const tracks=new Map();let dbPromise;
const isId=id=>typeof id==='string'&&/^lumiaudio_[a-f0-9]{64}$/.test(id);
export function validateAudioRef(raw){
  if(raw==null)return null;
  if(!isId(raw.id)||typeof raw.name!=='string'||raw.name.length>100||!Number.isFinite(raw.duration)||raw.duration<=0||raw.duration>CLIP_SECONDS||!Number.isFinite(raw.volume)||raw.volume<0||raw.volume>1)throw new Error('El audio del diseño no es válido.');
  return {id:raw.id,name:raw.name,duration:raw.duration,volume:raw.volume};
}
export function validateAudioSettings(design){
  const options=design.audioOptions??(design.audio?[design.audio]:[]);
  if(!Array.isArray(options)||options.length>3)throw new Error('Cada invitación admite hasta 3 audios.');
  const audioOptions=options.map(validateAudioRef),ids=new Set(audioOptions.map(a=>a?.id));
  if(audioOptions.some(a=>!a)||ids.size!==audioOptions.length)throw new Error('Las opciones de audio no son válidas.');
  const selected=validateAudioRef(design.audio);if(selected&&!ids.has(selected.id))throw new Error('El audio seleccionado no está en esta invitación.');
  return {audioOptions,audio:selected?{...audioOptions.find(a=>a.id===selected.id)}:null};
}
export function encodeWav(samples){
  const pcm=samples.subarray(0,SAMPLE_RATE*CLIP_SECONDS),bytes=new Uint8Array(44+pcm.length*2),v=new DataView(bytes.buffer);
  const text=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SAMPLE_RATE,true);v.setUint32(28,SAMPLE_RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,pcm.length*2,true);
  for(let i=0;i<pcm.length;i++){const s=Math.max(-1,Math.min(1,pcm[i]||0));v.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true);}return bytes;
}
export function inspectWav(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<46||bytes.length>MAX_WAV_BYTES)throw new Error('El audio incluido no es válido.');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=(at,n)=>String.fromCharCode(...bytes.subarray(at,at+n));
  if(tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||tag(36,4)!=='data'||v.getUint32(4,true)!==bytes.length-8||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==SAMPLE_RATE||v.getUint32(28,true)!==SAMPLE_RATE*2||v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||v.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2)throw new Error('El audio incluido está dañado.');
  return (bytes.length-44)/2/SAMPLE_RATE;
}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
function decode(data){if(typeof data!=='string'||data.length>MAX_WAV_BYTES*4/3+40||!/^data:audio\/wav;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw new Error('El audio incluido no es válido.');return Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));}
async function hash(bytes){return 'lumiaudio_'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function database(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('lumimila-audio-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=r.onblocked=()=>reject(new Error('No se pudo abrir el almacenamiento del audio.'));}).catch(e=>{dbPromise=null;throw e;});return dbPromise;}
async function prepare(raw){
  if(!raw||!isId(raw.id)||typeof raw.name!=='string'||raw.name.length>100)throw new Error('El audio incluido no es válido.');
  const bytes=decode(raw.data),duration=inspectWav(bytes);if(await hash(bytes)!==raw.id)throw new Error('El audio incluido está dañado.');
  return {id:raw.id,name:raw.name.replace(/[\u0000-\u001f]/g,''),data:raw.data,duration};
}
async function persist(record){
  if(tracks.has(record.id))return;
  if(tracks.size>=30)throw new Error('Llegaste al límite de 30 audios guardados en este navegador.');
  const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put(record);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(new Error('No hay espacio para guardar el audio.'));});tracks.set(record.id,record);
}
export async function initializeAudio(){const db=await database(),all=await new Promise((resolve,reject)=>{const r=db.transaction('tracks').objectStore('tracks').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});for(const raw of all){try{const record=await prepare(raw);tracks.set(record.id,record);}catch{ /* Missing audio is reported when its design is played or exported. */ }}}
export function audioRecord(ref){if(!ref)return null;const record=tracks.get(ref.id);if(!record)throw new Error('Falta el audio. Vuelve a subirlo o importa el diseño con su audio.');return record;}
export async function uploadAudio(file){
  if(!/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)||file.size>20*1024*1024)throw new Error('Usa un archivo MP3, WAV, M4A, AAC u OGG de hasta 20 MB.');
  const ctx=new AudioContext();let decoded;
  try{decoded=await ctx.decodeAudioData(await file.arrayBuffer());}catch{throw new Error('No se pudo leer el audio. Prueba un archivo MP3 o WAV.');}finally{await ctx.close();}
  const duration=Math.min(CLIP_SECONDS,decoded.duration);if(!duration)throw new Error('Este audio está vacío.');
  const offline=new OfflineAudioContext(1,Math.ceil(duration*SAMPLE_RATE),SAMPLE_RATE),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start(0,0,duration);
  const rendered=await offline.startRendering(),bytes=encodeWav(rendered.getChannelData(0));
  const record={id:await hash(bytes),name:file.name.slice(0,100),duration:inspectWav(bytes),data:`data:audio/wav;base64,${base64(bytes)}`};await persist(record);
  return {ref:{id:record.id,name:record.name,duration:record.duration,volume:.8},trimmed:decoded.duration>CLIP_SECONDS};
}
export function audioBuffer(ref,{pad=false}={}){
  const record=audioRecord(ref);if(!record)return null;const bytes=decode(record.data),duration=inspectWav(bytes),length=Math.round((pad?CLIP_SECONDS:duration)*SAMPLE_RATE);
  const buffer=new AudioBuffer({numberOfChannels:1,length,sampleRate:SAMPLE_RATE}),data=buffer.getChannelData(0),v=new DataView(bytes.buffer);
  for(let i=0;i<(bytes.length-44)/2;i++)data[i]=v.getInt16(44+i*2,true)/32768*ref.volume;
  return buffer;
}
export function exportAudio(design){return (design.audioOptions||[]).map(ref=>({...audioRecord(ref)}));}
export async function importAudio(raw=[],design){
  const options=design.audioOptions||[];
  if(!Array.isArray(raw)||raw.length!==options.length||new Set(raw.map(r=>r?.id)).size!==raw.length)throw new Error('El diseño no incluye todos sus audios.');
  const prepared=[];
  for(const ref of options){const input=raw.find(r=>r?.id===ref.id);if(!input)throw new Error('Falta una opción de audio.');const record=await prepare(input);if(Math.abs(record.duration-ref.duration)>1/SAMPLE_RATE)throw new Error('La duración del audio no coincide.');prepared.push(record);}
  for(const record of prepared)await persist(record);
}
