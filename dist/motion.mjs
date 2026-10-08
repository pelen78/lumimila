import {renderDesign} from './core.mjs';
import {audioBuffer,CLIP_SECONDS} from './audio.mjs';
export const EFFECTS=['none','sparkle','confetti','bubbles'];
export const validateEffect=value=>{if(value==null)return 'none';if(!EFFECTS.includes(value))throw new Error('La animación del diseño no es válida.');return value;};
const palette=['#F88C80','#FFC765','#72b7c4','#99b895','#c9a7d6'];
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function drawEffect(ctx,effect,time,width,height){
  if(!effect||effect==='none')return;
  ctx.save();ctx.scale(width/500,height/700);
  const count=effect==='confetti'?62:effect==='sparkle'?30:20;
  for(let i=0;i<count;i++){
    const r=random(i+1),x0=random(i+90)*500;
    // Keep the center quieter so the invitation's details stay legible.
    const x=x0>125&&x0<375?(i%2?35+r*75:390+r*75):x0;
    ctx.save();ctx.fillStyle=palette[i%palette.length];ctx.strokeStyle=palette[i%palette.length];
    if(effect==='sparkle'){
      const y=random(i+150)*700,pulse=Math.pow((Math.sin(time*(1+r)+i*2)+1)/2,3),size=3+7*pulse;
      ctx.globalAlpha=.2+.65*pulse;ctx.translate(x,y);ctx.fillStyle=i%3===0?'#ffffff':'#e8b951';ctx.shadowColor='#fff7c7';ctx.shadowBlur=9;
      ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,rad=j%2?size*.22:size;ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}ctx.closePath();ctx.fill();
    }else if(effect==='confetti'){
      const y=(random(i+31)*780+time*(25+r*30))%780-40;
      ctx.translate(x+Math.sin(time+i)*13,y);ctx.rotate(i+time*(r+.5));ctx.globalAlpha=.72;ctx.fillRect(-2,-4,3+4*r,4+6*r);
    }else{
      const y=740-((random(i+60)*780+time*(15+r*22))%780),radius=7+r*15;
      ctx.translate(x+Math.sin(time*.6+i)*12,y);ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.6;ctx.lineWidth=1.1;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,radius*.68,Math.PI*1.1,Math.PI*1.55);ctx.stroke();
    }ctx.restore();
  }ctx.restore();
}
export async function exportVideo(design,{signal,onProgress=()=>{}}={}){
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio}=await import('./vendor/mediabunny.mjs');
  const width=1000,height=1400,fps=30,quality=new Quality({bitrate:5_000_000});
  if(!await canEncodeVideo('avc',{width,height,frameRate:fps,quality}))throw new Error('Este navegador no permite crear MP4. Abre Lumimila en una versión reciente de Chrome, Edge o Safari para descargar el video.');
  if(design.audio&&!await canEncodeAudio('aac',{sampleRate:48000,numberOfChannels:1}))throw new Error('Este navegador no permite incluir sonido en MP4. Prueba en Chrome, Edge o Safari actualizado.');
  const base=document.createElement('canvas');await renderDesign(base,design,2);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
  const output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()}),video=new CanvasSource(canvas,{codec:'avc',quality});output.addVideoTrack(video,{frameRate:fps});
  const audio=design.audio?new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:128000})}):null;if(audio)output.addAudioTrack(audio);
  const abort=()=>{if(signal?.aborted)throw new DOMException('Exportación cancelada.','AbortError');};
  try{
    abort();await output.start();
    if(audio){await audio.add(audioBuffer(design.audio,{pad:true}));audio.close();}
    for(let frame=0;frame<fps*CLIP_SECONDS;frame++){
      abort();ctx.drawImage(base,0,0);drawEffect(ctx,design.animation,frame/fps,width,height);await video.add(frame/fps,1/fps,{keyFrame:frame%60===0});
      if(frame%15===0){onProgress(frame/(fps*CLIP_SECONDS));await new Promise(resolve=>setTimeout(resolve,0));}
    }
    video.close();abort();await output.finalize();onProgress(1);return new Blob([output.target.buffer],{type:'video/mp4'});
  }catch(e){await output.cancel().catch(()=>{});throw e;}
}
