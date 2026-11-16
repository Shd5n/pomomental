const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const active=new Map();
function target(event){const el=event.target.closest?.('button, a.primary, [role="button"]');return el&&!el.disabled&&!el.closest('.pm-companion-stage')?el:null;}
function down(el,event){
  if(active.has(el))return;
  const strong=el.classList.contains('primary');
  el.classList.add('pm-tactile','pm-pressed');
  if(!reduced.matches){
    const rect=el.getBoundingClientRect(),x=event.clientX?event.clientX-rect.left:rect.width/2,y=event.clientY?event.clientY-rect.top:rect.height/2;
    const ripple=document.createElement('span');ripple.className='pm-touch-ink';ripple.setAttribute('aria-hidden','true');
    ripple.style.cssText=`left:${x}px;top:${y}px;width:${Math.max(rect.width,rect.height)*2}px;height:${Math.max(rect.width,rect.height)*2}px`;
    el.append(ripple);ripple.animate([{transform:'translate(-50%,-50%) scale(0)',opacity:strong?.23:.14},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:strong?650:500,easing:'cubic-bezier(.18,.8,.25,1)'}).finished.finally(()=>ripple.remove());
    const animation=el.animate([{transform:'scale(1)'},{transform:`scale(${strong?.964:.978}) translateY(1px)`}],{duration:100,fill:'forwards',easing:'ease-out'});active.set(el,animation);
  }else active.set(el,null);
  if(event.pointerType==='touch'&&localStorage.getItem('pm-haptics')==='true')navigator.vibrate?.(strong?9:5);
}
function release(el){if(!active.has(el))return;active.get(el)?.cancel();active.delete(el);el.classList.remove('pm-pressed');if(!reduced.matches)el.animate([{transform:'scale(.978) translateY(1px)'},{transform:'scale(1.012) translateY(-.5px)',offset:.56},{transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.2,.7,.35,1)'});}
document.addEventListener('pointerdown',event=>{const el=target(event);if(el)down(el,event);},{passive:true});
document.addEventListener('pointerup',()=>[...active.keys()].forEach(release),{passive:true});
document.addEventListener('pointercancel',()=>[...active.keys()].forEach(release),{passive:true});
document.addEventListener('keydown',event=>{if(!event.repeat&&['Enter',' '].includes(event.key)){const el=target(event);if(el)down(el,event);}});
document.addEventListener('keyup',()=>[...active.keys()].forEach(release));
window.addEventListener('blur',()=>[...active.keys()].forEach(release));
