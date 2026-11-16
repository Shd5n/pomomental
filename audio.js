// PomoMental sound studio. Procedurally generated audio only: no music or recordings.
export const sounds = [
  {id:'brown',name:'Brown noise',nameAr:'ضوضاء بنية',icon:'◉',color:'#987758',group:'noise'},
  {id:'pink',name:'Pink noise',nameAr:'ضوضاء وردية',icon:'◉',color:'#d989ae',group:'noise'},
  {id:'white',name:'White noise',nameAr:'ضوضاء بيضاء',icon:'◉',color:'#d9e2ed',group:'noise'},
  {id:'blue',name:'Blue noise',nameAr:'ضوضاء زرقاء',icon:'◉',color:'#5b9bff',group:'noise'},
  {id:'violet',name:'Violet noise',nameAr:'ضوضاء بنفسجية',icon:'◉',color:'#a491ed',group:'noise'},
  {id:'grey',name:'Grey noise · soft contour',nameAr:'ضوضاء رمادية · طيف ناعم',icon:'◉',color:'#939dad',group:'noise'},
  {id:'green',name:'Green noise · midrange',nameAr:'ضوضاء خضراء · ترددات وسطية',icon:'◉',color:'#70bd9c',group:'noise'},
  {id:'rain',name:'Gentle rain',nameAr:'مطر بدون رعد',icon:'☂',color:'#719ec3',group:'nature'},
  {id:'thunder',name:'Rain & distant thunder',nameAr:'مطر ورعد بعيد',icon:'ϟ',color:'#8996c9',group:'nature'},
  {id:'ocean',name:'Ocean waves',nameAr:'أمواج البحر',icon:'≈',color:'#52b7bf',group:'nature'},
  {id:'wind',name:'Evening wind',nameAr:'نسيم المساء',icon:'≋',color:'#9fb9c4',group:'nature'},
  {id:'fire',name:'Fireplace',nameAr:'حطب المدفأة',icon:'♧',color:'#da986b',group:'nature'}
];

export class SoundEngine {
  constructor() { this.context=null; this.active=new Map(); this.volumes=new Map(); this.buffers=new Map(); this.master=null; this.onChange=null; }
  get supported(){return sounds;}
  get activeIds(){return [...this.active.keys()];}
  isActive(id){return this.active.has(id);}
  async init(){
    if(!this.context){
      const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!AudioContext)throw new Error('Web Audio is unavailable in this browser.');
      this.context=new AudioContext();
      // A compressor keeps the mix bounded as more sound layers are enabled.
      const limiter=this.context.createDynamicsCompressor();
      limiter.threshold.value=-15;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.015;limiter.release.value=.25;
      this.master=this.context.createGain();this.master.gain.value=.55;
      this.master.connect(limiter);limiter.connect(this.context.destination);
    }
    if(this.context.state!=='running')await this.context.resume();
  }
  makeBuffer(type,duration=12){
    const key=type+duration;if(this.buffers.has(key))return this.buffers.get(key);
    const ctx=this.context,buffer=ctx.createBuffer(2,Math.floor(ctx.sampleRate*duration),ctx.sampleRate);
    for(let channel=0;channel<2;channel++){
      const out=buffer.getChannelData(channel);let brown=0,p1=0,p2=0,b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,peak=0,sum=0;
      for(let i=0;i<out.length;i++){
        const w=Math.random()*2-1;let v=w;
        if(type==='brown'){brown=(brown+.02*w)/1.02;v=brown*3.5;}
        else if(type==='pink'){
          b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;
          b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;
          v=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;
        }else if(type==='blue'){v=(w-p1)*.48;p1=w;}
        else if(type==='violet'){v=(w-2*p1+p2)*.26;p2=p1;p1=w;}
        out[i]=v;peak=Math.max(peak,Math.abs(v));sum+=v*v;
      }
      const rms=Math.sqrt(sum/out.length)||1,scale=Math.min(.22/rms,.8/(peak||1));
      // Short cosine tapers meet at zero to avoid a click at the loop boundary.
      const seam=Math.min(1024,Math.floor(out.length/20));
      for(let i=0;i<out.length;i++)out[i]*=scale;
      for(let i=0;i<seam;i++){const taper=.5-.5*Math.cos(Math.PI*i/(seam-1));out[i]*=taper;out[out.length-1-i]*=taper;}
    }
    this.buffers.set(key,buffer);return buffer;
  }
  filter(type,frequency,q=.5){const n=this.context.createBiquadFilter();n.type=type;n.frequency.value=frequency;n.Q.value=q;return n;}
  layer(entry,type,volume=1,filters=[]){
    const source=this.context.createBufferSource();source.buffer=this.makeBuffer(type);source.loop=true;
    const gain=this.context.createGain();gain.gain.value=volume;
    let last=source;for(const filter of filters){last.connect(filter);last=filter;}last.connect(gain);gain.connect(entry.gain);
    source.start(0,Math.random()*8);entry.nodes.push(source,gain,...filters);entry.sources.push(source);return gain;
  }
  modulate(entry,param,frequency,depth){
    const lfo=this.context.createOscillator(),gain=this.context.createGain();lfo.frequency.value=frequency;gain.gain.value=depth;
    lfo.connect(gain);gain.connect(param);lfo.start();entry.nodes.push(lfo,gain);entry.sources.push(lfo);
  }
  scheduleThunder(entry){
    const tick=()=>{
      if(!this.active.has('thunder'))return;
      const ctx=this.context,t=ctx.currentTime,source=ctx.createBufferSource(),gain=ctx.createGain(),low=this.filter('lowpass',180);
      source.buffer=this.makeBuffer('brown');gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.9,t+1.4);gain.gain.exponentialRampToValueAtTime(.001,t+6.5);
      source.connect(low);low.connect(gain);gain.connect(entry.gain);source.start(t);source.stop(t+7);
      source.onended=()=>{source.disconnect();low.disconnect();gain.disconnect();};
      entry.timeout=setTimeout(tick,16000+Math.random()*20000);
    };
    entry.timeout=setTimeout(tick,5000+Math.random()*5000);
  }
  create(id){
    const ctx=this.context,gain=ctx.createGain();gain.gain.value=0;gain.connect(this.master);
    const entry={gain,nodes:[gain],sources:[],timeout:null};this.active.set(id,entry);
    if(['brown','pink','white','blue','violet'].includes(id))this.layer(entry,id,id==='violet'?.5:id==='blue'?.65:1);
    else if(id==='green')this.layer(entry,'pink',1.6,[this.filter('bandpass',500,.55)]);
    else if(id==='grey'){
      const contour=this.filter('peaking',2600,.55);contour.gain.value=-6;
      this.layer(entry,'pink',1.15,[contour,this.filter('lowpass',11000)]);
    }
    else if(id==='rain'||id==='thunder'){
      const bed=this.layer(entry,'pink',1.15,[this.filter('highpass',450),this.filter('lowpass',6500)]);
      this.layer(entry,'white',.3,[this.filter('highpass',3000)]);this.modulate(entry,bed.gain,.16,.12);
      if(id==='thunder')this.scheduleThunder(entry);
    }else if(id==='ocean'){
      const bed=this.layer(entry,'pink',.9,[this.filter('lowpass',1700)]);this.modulate(entry,bed.gain,.073,.6);
      this.layer(entry,'brown',.25);
    }else if(id==='wind'){
      const filter=this.filter('lowpass',750,.8),bed=this.layer(entry,'pink',1.1,[filter]);
      this.modulate(entry,filter.frequency,.04,350);this.modulate(entry,bed.gain,.09,.3);
    }else if(id==='fire'){
      this.layer(entry,'brown',.9,[this.filter('lowpass',700)]);
      const source=ctx.createBufferSource(),buffer=ctx.createBuffer(2,ctx.sampleRate*13,ctx.sampleRate);
      for(let c=0;c<2;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)if(Math.random()<.0005){const len=200+Math.floor(Math.random()*700),amp=.04+Math.random()*.1;for(let j=0;j<len&&i+j<data.length;j++)data[i+j]+=(Math.random()*2-1)*amp*Math.exp(-j/(len*.2));}}
      source.buffer=buffer;source.loop=true;source.connect(entry.gain);source.start();entry.sources.push(source);entry.nodes.push(source);
    }
    this.adjustMix();return entry;
  }
  adjustMix(){
    if(!this.context)return;const divisor=Math.sqrt(Math.max(1,this.active.size));
    for(const [id,e]of this.active)e.gain.gain.setTargetAtTime((this.volumes.get(id)??.55)/divisor,this.context.currentTime,.14);
  }
  async toggle(id){
    if(!sounds.some(s=>s.id===id))throw new Error('Unknown sound');
    await this.init();if(this.active.has(id)){this.stop(id);return false;}
    this.create(id);this.onChange?.(this.activeIds);return true;
  }
  stop(id){
    const entry=this.active.get(id);if(!entry)return;this.active.delete(id);clearTimeout(entry.timeout);
    entry.gain.gain.setTargetAtTime(0,this.context.currentTime,.08);
    setTimeout(()=>{for(const source of entry.sources){try{source.stop();}catch{}}for(const node of entry.nodes){try{node.disconnect();}catch{}}},450);
    this.adjustMix();this.onChange?.(this.activeIds);
  }
  setVolume(id,volume){const v=Math.max(0,Math.min(1,Number(volume)||0));this.volumes.set(id,v);this.adjustMix();}
  getVolume(id){return this.volumes.get(id)??.55;}
  setMasterVolume(volume){if(this.master)this.master.gain.setTargetAtTime(Math.max(0,Math.min(1,Number(volume)||0))*.7,this.context.currentTime,.1);}
  stopAll(){for(const id of [...this.active.keys()])this.stop(id);}
  async dispose(){this.stopAll();if(this.context){await this.context.close();this.context=null;this.buffers.clear();}}
}

export const soundDescriptors=sounds;
