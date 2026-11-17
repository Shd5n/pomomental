import {sounds} from './audio.js';
// Only Web Audio on this device. No room API, microphone, or shared audio state.
export function renderRoomSounds(container,{audio,lang,esc,toast}){
  if(!audio)return;
  const t=(ar,en)=>lang==='ar'?ar:en;
  container.innerHTML=`<div class="panel-head"><h2>${t('جوّك الخاص','Your own sound mix')}</h2><button type="button" class="quiet-button" data-mute>${t('إيقاف الكل','Mute all')}</button></div><p class="muted sound-privacy">${t('اختر اللي يريحك. الأصوات عندك فقط، وكل شخص يضبط جوّه.','Choose what helps you focus. Only you hear this mix; everyone has their own.')}</p><div class="room-sounds-grid">${sounds.map(s=>`<div class="room-sound"><button type="button" data-room-sound="${s.id}" aria-pressed="${audio.isActive(s.id)}"><span class="sound-indicator" style="--sound-color:${s.color}" aria-hidden="true"></span><span>${esc(lang==='ar'?s.nameAr:s.name)}</span></button><input type="range" min="0" max="1" step="0.01" value="${audio.getVolume(s.id)}" data-room-volume="${s.id}" aria-label="${esc(t('مستوى ','Volume: ')+(lang==='ar'?s.nameAr:s.name))}"></div>`).join('')}</div>`;
  function refresh(){container.querySelectorAll('[data-room-sound]').forEach(b=>b.setAttribute('aria-pressed',String(audio.isActive(b.dataset.roomSound))));}
  const pending=new Set();
  container.querySelectorAll('[data-room-sound]').forEach(button=>button.addEventListener('click',async()=>{
    const id=button.dataset.roomSound;if(pending.has(id))return;pending.add(id);button.disabled=true;
    try{await audio.toggle(id);refresh();}catch{toast?.(t('تعذّر تشغيل الصوت. جرّب مرة ثانية.','Could not play this sound. Try again.'));}finally{pending.delete(id);button.disabled=false;}
  }));
  container.querySelectorAll('[data-room-volume]').forEach(input=>input.addEventListener('input',()=>audio.setVolume(input.dataset.roomVolume,Number(input.value))));
  container.querySelector('[data-mute]').addEventListener('click',()=>{audio.stopAll();refresh();});
}
