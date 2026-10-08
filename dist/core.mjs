export const W=500, H=700;
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => globalThis.crypto.randomUUID();
export const FONTS = ['Fraunces','DM Sans','Georgia'];
export const COLORS = ['#245776','#d36b47','#dba936','#456451','#3d3d35','#ffffff'];
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function textLayer(id,text,y,size,color,extra={}) {
  return {id,type:'text',text,label:text,x:65,y,w:370,h:size*1.35,size,color,font:'DM Sans',weight:400,align:'center',editable:false,locked:false,maxLength:80,...extra};
}
export function birthday() {
  return {id:uid(),name:'Cumpleaños de Mateo',width:W,height:H,background:'#fff8e8',backgroundImage:'./assets/fiesta-bg.png',elements:[
    textLayer('intro','¡VEN A CELEBRAR!',198,14,'#d36b67',{weight:600,maxLength:45}),
    textLayer('name','Mateo',234,60,'#3186af',{font:'Fraunces',weight:650,editable:true,label:'Nombre del festejado',maxLength:35,h:80}),
    textLayer('age','MIS 5 AÑOS',316,21,'#d36b67',{weight:600,editable:true,label:'Edad o motivo',maxLength:35}),
    {id:'ornament',type:'shape',shape:'line',x:215,y:364,w:70,h:2,color:'#e4b841',locked:false,editable:false,label:'Separador'},
    textLayer('date','SÁBADO 24 DE OCTUBRE',386,15,'#3186af',{weight:600,editable:true,label:'Fecha',maxLength:55}),
    textLayer('time','4:00 de la tarde',414,14,'#5b726b',{editable:true,label:'Hora',maxLength:40}),
    textLayer('place','Jardín de la alegría',442,18,'#3186af',{font:'Fraunces',weight:600,editable:true,label:'Lugar',maxLength:60}),
    textLayer('address','Calle de las Flores 123',471,12,'#5b726b',{editable:true,label:'Dirección',maxLength:85}),
    textLayer('rsvp','Confirma tu asistencia · 81 1234 5678',497,10,'#746852',{editable:true,label:'Confirmación',maxLength:85})
  ],updatedAt:Date.now()};
}
export function blank() {return {id:uid(),name:'Mi nueva invitación',width:W,height:H,background:'#fffaf1',backgroundImage:null,elements:[textLayer(uid(),'Una ocasión especial',290,40,'#394737',{font:'Fraunces',editable:true,label:'Título'})],updatedAt:Date.now()};}
export function customerCopy(template) {const draft=clone(template); draft.id=uid(); return draft;}
export function setCustomerText(draft,id,text) {const el=draft.elements.find(e=>e.id===id); if(!el || el.type!=='text' || !el.editable) return false; el.text=String(text).slice(0,el.maxLength);return true;}
export function moveElement(el,dx,dy) {if(el.locked)return;el.x=clamp(el.x+dx,0,W-el.w);el.y=clamp(el.y+dy,0,H-el.h);}
export function hitTest(elements,x,y){return [...elements].reverse().find(e=>x>=e.x && x<=e.x+e.w && y>=e.y && y<=e.y+e.h);}
function validImage(src) {return src===null || src==='./assets/fiesta-bg.png' || (typeof src==='string' && src.length<10000000 && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src));}
export function validateDesign(raw) {
  if(!raw || typeof raw!=='object' || raw.width!==W || raw.height!==H || !Array.isArray(raw.elements) || raw.elements.length>100) throw new Error('El archivo no es una plantilla compatible.');
  if(!validImage(raw.backgroundImage ?? null)) throw new Error('El fondo del archivo no es compatible.');
  const color=v=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
  const ids=new Set();
  for(const e of raw.elements){
    if(!e || !['text','image','shape'].includes(e.type)||typeof e.id!=='string'||ids.has(e.id))throw new Error('La plantilla tiene elementos inválidos.');
    ids.add(e.id);
    if(!['x','y','w','h'].every(k=>Number.isFinite(e[k])) || e.w<1 || e.h<1 || e.w>W || e.h>H || e.x<0 || e.y<0 || e.x+e.w>W+.1 || e.y+e.h>H+.1)throw new Error('Hay un elemento fuera del lienzo.');
    if(e.type==='text' && (typeof e.text!=='string'||e.text.length>500 || !FONTS.includes(e.font) || !Number.isFinite(e.size)||e.size<6||e.size>120||!Number.isFinite(e.weight)||e.weight<100||e.weight>900||!['left','center','right'].includes(e.align)||!Number.isInteger(e.maxLength)||e.maxLength<1||e.maxLength>500||!color(e.color)))throw new Error('El formato de texto no es válido.');
    if(e.type==='image' && (!validImage(e.src)||!e.src))throw new Error('La imagen no es compatible.');
    if(e.type==='shape' && (!['line','circle','rect','star','heart'].includes(e.shape)||!color(e.color)))throw new Error('El elemento decorativo no es válido.');
    e.editable=e.type==='text' && Boolean(e.editable);e.locked=Boolean(e.locked);e.label=String(e.label||'Elemento').slice(0,80);
  }
  if(!color(raw.background))throw new Error('El color de fondo no es válido.');
  return {...raw,id:typeof raw.id==='string'?raw.id:uid(),name:String(raw.name||'Mi invitación').slice(0,80),backgroundImage:raw.backgroundImage||null,updatedAt:Number.isFinite(raw.updatedAt)?raw.updatedAt:Date.now()};
}
const images=new Map();
export async function loadImage(src) {
  if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(src);reject(new Error('No se pudo cargar una imagen.'));};img.src=src;}));
  return images.get(src);
}
export function wrapText(ctx,text,width) {
  const result=[];
  for(const paragraph of text.split('\n')){
    if(!paragraph){result.push('');continue;}
    let line='';
    for(const word of paragraph.split(/\s+/)){
      const attempt=line?`${line} ${word}`:word;
      if(ctx.measureText(attempt).width<=width){line=attempt;continue;}
      if(line){result.push(line);line='';}
      if(ctx.measureText(word).width<=width){line=word;continue;}
      for(const char of word){if(ctx.measureText(line+char).width>width && line){result.push(line);line='';}line+=char;}
    }
    result.push(line);
  }
  return result;
}
export function fitText(ctx,e) {
  let size=e.size,lines;
  do {ctx.font=`${e.weight} ${size}px "${e.font}"`;lines=wrapText(ctx,e.text,e.w);if(lines.length*size*1.2<=e.h || size<=6)break;size-=.5;}while(size>=6);
  return {size,lines};
}
export async function renderDesign(canvas,design,scale=2) {
  const prepared=await Promise.all([design.backgroundImage?loadImage(design.backgroundImage):null,...design.elements.map(e=>e.type==='image'?loadImage(e.src):null)]);
  const ctx=canvas.getContext('2d');canvas.width=W*scale;canvas.height=H*scale;ctx.scale(scale,scale);
  ctx.fillStyle=design.background;ctx.fillRect(0,0,W,H);
  if(prepared[0])ctx.drawImage(prepared[0],0,0,W,H);
  for(let i=0;i<design.elements.length;i++){
    const e=design.elements[i];ctx.save();
    if(e.type==='image'){ctx.drawImage(prepared[i+1],e.x,e.y,e.w,e.h);}
    else if(e.type==='text'){
      const {size,lines}=fitText(ctx,e);ctx.fillStyle=e.color;ctx.textAlign=e.align;ctx.textBaseline='middle';
      const x=e.align==='center'?e.x+e.w/2:e.align==='right'?e.x+e.w:e.x;
      const top=e.y+(e.h-lines.length*size*1.2)/2;
      ctx.beginPath();ctx.rect(e.x,e.y,e.w,e.h);ctx.clip();
      lines.forEach((line,j)=>ctx.fillText(line,x,top+(j+.5)*size*1.2));
    }else{
      ctx.fillStyle=e.color;ctx.strokeStyle=e.color;
      if(e.shape==='line'||e.shape==='rect')ctx.fillRect(e.x,e.y,e.w,e.h);
      if(e.shape==='circle'){ctx.beginPath();ctx.ellipse(e.x+e.w/2,e.y+e.h/2,e.w/2,e.h/2,0,0,Math.PI*2);ctx.fill();}
      if(e.shape==='star'){ctx.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?.43:1;ctx.lineTo(e.x+e.w/2+Math.cos(a)*e.w/2*r,e.y+e.h/2+Math.sin(a)*e.h/2*r);}ctx.closePath();ctx.fill();}
      if(e.shape==='heart'){ctx.translate(e.x,e.y);ctx.scale(e.w/100,e.h/100);ctx.beginPath();ctx.moveTo(50,92);ctx.bezierCurveTo(-35,35,10,-15,50,24);ctx.bezierCurveTo(90,-15,135,35,50,92);ctx.fill();}
    }
    ctx.restore();
  }
  return canvas;
}
export function jpegToPdf(jpegBytes,pixelW,pixelH) {
  const enc=new TextEncoder();const chunks=[];const offsets=[0];let length=0;
  const add=v=>{const b=typeof v==='string'?enc.encode(v):v;chunks.push(b);length+=b.length;};
  const obj=(id,body)=>{offsets[id]=length;add(`${id} 0 obj\n${body}\nendobj\n`);};
  add('%PDF-1.4\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 504] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4]=length;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);add(jpegBytes);add('\nendstream\nendobj\n');
  const content='q 360 0 0 504 0 0 cm /Im0 Do Q';obj(5,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
  const xref=length;add('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks,{type:'application/pdf'});
}
