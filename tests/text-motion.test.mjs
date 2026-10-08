import test from 'node:test';
import assert from 'node:assert/strict';
import {birthday,blank,clone,prepareDesignRenderer,renderDesign} from '../dist/estudio/core.mjs';
import {textEntranceTimeline} from '../dist/estudio/motion.mjs';

test('Text entrances require an effect, independent of whether audio is selected',()=>{
  for(const audio of [null,{id:'selected-track'}]){
    const design={...birthday(),audio};
    for(const animation of [undefined,'none']){
      const timeline=textEntranceTimeline({...design,animation});
      assert.equal(timeline.end,0);
      for(const time of [0,.5,15])assert.deepEqual(timeline.at(design.elements[0],time),{opacity:1,offsetY:0});
    }
    for(const animation of ['sparkle','confetti','bubbles']){
      const timeline=textEntranceTimeline({...design,animation});
      assert.equal(timeline.at(design.elements[0],0).opacity,0);
      assert.ok(timeline.at(design.elements[0],.4).opacity>0);
      for(const element of design.elements.filter(e=>e.type==='text'))assert.deepEqual(timeline.at(element,15),{opacity:1,offsetY:0});
    }
  }
});

test('Text enters in visual reading order without changing paint order or counting empty layers',()=>{
  const design={...birthday(),animation:'confetti'};
  design.elements.reverse();
  design.elements.push({...design.elements.find(e=>e.type==='text'),id:'empty',text:'  ',y:0});
  const original=clone(design),timeline=textEntranceTimeline(design);
  const intro=design.elements.find(e=>e.id==='intro'),name=design.elements.find(e=>e.id==='name');
  assert.ok(timeline.at(intro,.4).opacity>0);
  assert.equal(timeline.at(name,.4).opacity,0);
  assert.deepEqual(design,original);
});

test('One or one hundred text layers finish early and remain readable until the video ends',()=>{
  for(const count of [0,1,8,100]){
    const design={...blank(),animation:'bubbles'};
    design.elements=Array.from({length:count},(_,i)=>({...design.elements[0],id:String(i),y:i*3}));
    const timeline=textEntranceTimeline(design);
    assert.ok(Number.isFinite(timeline.end)&&timeline.end<=4.5);
    for(const e of design.elements){
      assert.deepEqual(timeline.at(e,4.5),{opacity:1,offsetY:0});
      assert.deepEqual(timeline.at(e,14.9),{opacity:1,offsetY:0});
    }
  }
});

test('Reduced-motion preview keeps the text fade and removes the slide',()=>{
  const design={...birthday(),animation:'sparkle'};
  const normal=textEntranceTimeline(design),reduced=textEntranceTimeline(design,{reducedMotion:true});
  const a=normal.at(design.elements[0],.4),b=reduced.at(design.elements[0],.4);
  assert.ok(a.offsetY>0);assert.equal(b.offsetY,0);assert.equal(a.opacity,b.opacity);
});

test('Frame renderer preserves overlapping layers and static exports show every text',async()=>{
  const original=globalThis.document;
  globalThis.document={fonts:{load:async()=>[]}};
  const paints=[],stack=[];
  const state={globalAlpha:1,font:'',offset:0};
  const ctx=new Proxy(state,{get(target,key){
    if(key==='save')return ()=>stack.push({...target});
    if(key==='restore')return ()=>Object.assign(target,stack.pop());
    if(key==='translate')return (_,y)=>target.offset+=y;
    if(key==='measureText')return text=>({width:text.length*5});
    if(key==='fillText')return text=>paints.push({text,alpha:target.globalAlpha,offset:target.offset});
    if(key==='fillRect')return ()=>paints.push({shape:target.fillStyle,alpha:target.globalAlpha,offset:target.offset});
    return key in target?target[key]:()=>{};
  }});
  try{
    const template=blank().elements[0];
    const design={...blank(),animation:'sparkle',elements:[
      {...template,id:'low',text:'Abajo',y:300},
      {id:'cover',type:'shape',shape:'rect',x:65,y:300,w:100,h:20,color:'#123456'},
      {...template,id:'high',text:'Arriba',y:100}
    ]};
    const draw=await prepareDesignRenderer(design,1),timeline=textEntranceTimeline(design);
    draw(ctx,e=>timeline.at(e,.4));
    assert.deepEqual(paints.filter(p=>p.text).map(p=>p.text),['Arriba']);
    assert.equal(paints.find(p=>p.shape==='#123456').alpha,1);
    paints.length=0;draw(ctx,e=>timeline.at(e,2));
    assert.deepEqual(paints.map(p=>p.text||p.shape),[design.background,'Abajo','#123456','Arriba']);
    assert.ok(paints.every(p=>p.alpha===1&&p.offset===0));
    paints.length=0;
    const canvas={getContext:()=>ctx};await renderDesign(canvas,design,1);
    assert.deepEqual(paints.filter(p=>p.text).map(p=>p.text),['Abajo','Arriba']);
    assert.equal(canvas.width,500);assert.equal(canvas.height,700);
    assert.equal(stack.length,0);
  }finally{globalThis.document=original;}
});
