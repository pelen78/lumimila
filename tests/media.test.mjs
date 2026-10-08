import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav,inspectWav,validateAudioSettings,importAudio,exportAudio,SAMPLE_RATE} from '../dist/estudio/audio.mjs';
import {birthday,validateDesign,customerCopy} from '../dist/estudio/core.mjs';
import {drawEffect} from '../dist/estudio/motion.mjs';
const ref=(digit='a')=>({id:'lumiaudio_'+digit.repeat(64),name:'Mi audio',duration:15,volume:.8});
test('Audio is normalized to a bounded 15-second mono WAV with clipped PCM',()=>{
  const samples=new Float32Array(SAMPLE_RATE*18);samples.set([2,-2,0,.5]);const wav=encodeWav(samples),v=new DataView(wav.buffer);
  assert.equal(inspectWav(wav),15);assert.equal(v.getInt16(44,true),32767);assert.equal(v.getInt16(46,true),-32768);assert.equal(v.getInt16(50,true),16384);
  const damaged=wav.slice();damaged[24]=0;assert.throws(()=>inspectWav(damaged));assert.throws(()=>inspectWav(wav.subarray(0,20)));
});
test('Three audio choices and the selected track survive independent customer personalization',()=>{
  const original=validateDesign({...birthday(),animation:'confetti',audioOptions:[ref('a'),ref('b'),ref('c')],audio:ref('b')});const copy=customerCopy(original);copy.audio={...copy.audioOptions[2]};copy.audio.volume=.4;
  assert.equal(original.audio.id,ref('b').id);assert.equal(original.audioOptions[2].volume,.8);assert.equal(copy.animation,'confetti');assert.equal(validateDesign(copy).audio.id,ref('c').id);
});
test('Audio choice validation rejects overflow, duplicates, invalid volume and unoffered selections',()=>{
  assert.throws(()=>validateAudioSettings({audioOptions:[ref(),ref()]}));assert.throws(()=>validateAudioSettings({audioOptions:[ref('a'),ref('b'),ref('c'),ref('d')]}));assert.throws(()=>validateAudioSettings({audioOptions:[{...ref(),volume:2}]}));assert.throws(()=>validateAudioSettings({audioOptions:[ref('a')],audio:ref('b')}));assert.throws(()=>validateDesign({...birthday(),animation:'javascript:alert(1)'}));
  assert.deepEqual(validateAudioSettings({}),{audio:null,audioOptions:[]});
});
test('Missing or mismatched portable audio is blocked instead of silently losing sound',async()=>{
  const design={audioOptions:[ref()],audio:ref()};assert.throws(()=>exportAudio(design),/Falta/);await assert.rejects(importAudio([],design),/audios/);await assert.rejects(importAudio([{...ref(),data:'https://untrusted.invalid/audio.wav'}],design),/válido/);
});
test('Effects change across timestamps and keep the static design untouched',()=>{
  function capture(effect,time){const calls=[];const ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});drawEffect(ctx,effect,time,1000,1400);return calls;}
  assert.deepEqual(capture('none',0),[]);for(const effect of ['sparkle','confetti','bubbles']){const first=capture(effect,0);assert.notDeepEqual(first,capture(effect,2));assert.equal(first[0][0],'save');assert.equal(first.at(-1)[0],'restore');}
});
