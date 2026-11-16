/* Original, vector-based PomoMental companions. No external assets or libraries. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#2699e8';
const safeImage = value => typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value) ? value : '';
let nextId = 0;

function drawing(options, id) {
  const c = color(options.color), badge = esc((options.badge || 'PM').slice(0, 14));
  const logo = safeImage(options.logo), custom = safeImage(options.image);
  const type = ['saudi', 'anime', 'cat', 'robot'].includes(options.type) ? options.type : 'saudi';
  const eyes = `<g class="pm-eyes"><ellipse cx="105" cy="119" rx="6" ry="8" fill="#172238"/><ellipse cx="151" cy="119" rx="6" ry="8" fill="#172238"/><circle cx="107" cy="116" r="2" fill="#fff"/><circle cx="153" cy="116" r="2" fill="#fff"/></g>`;
  const cheeks = `<ellipse cx="89" cy="135" rx="10" ry="5" fill="#f0928e" opacity=".44"/><ellipse cx="166" cy="135" rx="10" ry="5" fill="#f0928e" opacity=".44"/><path d="M119 136Q128 144 137 136" fill="none" stroke="#9b5c56" stroke-width="3" stroke-linecap="round"/>`;
  let head = '';
  if (type === 'saudi') head = `<path d="M64 91Q61 44 126 43Q192 42 195 95L203 172Q183 182 164 170L91 170Q69 182 54 167Z" fill="url(#${id}-cloth)" stroke="#e8edf6" stroke-width="2"/>
    <path d="M67 95L60 161M78 100L70 165M183 99L193 164M174 108L184 171" stroke="#d89f9f" stroke-width="2" opacity=".6"/>
    <path d="M76 80Q84 53 127 52Q169 51 182 83L175 135Q168 161 128 166Q87 161 79 135Z" fill="url(#${id}-skin)"/>
    <path d="M73 79Q122 91 183 80L179 62Q132 42 81 62Z" fill="#fff4f2"/>
    <path d="M79 62Q129 47 178 62M76 69Q126 54 182 70" fill="none" stroke="#1c2434" stroke-width="6" stroke-linecap="round"/>
    <path d="M76 81Q128 91 182 81" fill="none" stroke="#e6b2ae" stroke-width="2"/>
    <path d="M89 102Q102 97 113 103M141 103Q153 97 165 103" stroke="#503e3c" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eyes}${cheeks}`;
  if (type === 'anime') head = `<path d="M70 102Q63 48 117 41Q175 31 191 83L182 134L73 133Z" fill="#202b4b"/>
    <path d="M78 89Q89 60 128 61Q170 63 180 95L174 135Q163 162 128 165Q92 160 81 135Z" fill="url(#${id}-skin)"/>
    <path d="M64 101L72 61L87 69L102 37L115 50L138 31L142 48L165 40L164 55L189 62L180 72L196 102L175 99L170 83L156 107L146 78L131 104L117 72L101 101L92 82L80 112Z" fill="#2b385b"/>
    <path d="M90 71L102 55M121 58L135 43M153 62L163 54" stroke="#465e8e" stroke-width="4" stroke-linecap="round"/>
    <path d="M92 105Q104 100 115 106M141 106Q153 100 165 105" stroke="#493b43" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eyes}${cheeks}<path d="M175 125L183 122" stroke="#91c5ff" stroke-width="3"/>`;
  if (type === 'cat') head = `<path d="M73 90L67 42Q90 45 107 62Q128 55 150 63Q170 44 188 44L181 94Q194 117 179 142Q165 164 128 165Q91 164 77 144Q60 118 73 90Z" fill="#c9d5ed" stroke="#91a8d0" stroke-width="2"/>
    <path d="M77 59L98 72L80 86ZM175 60L159 73L177 86Z" fill="#d19eaf"/>
    <path d="M115 60L118 82M130 59V80M143 61L139 82" stroke="#8a9fc6" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="128" cy="139" rx="31" ry="20" fill="#edf2fc"/>
    ${eyes}<path d="M122 133Q128 129 134 133L128 139Z" fill="#bc7993"/><path d="M128 139Q119 150 112 142M128 139Q137 150 144 142" fill="none" stroke="#596781" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M72 129L91 132M70 140L90 139M166 132L185 129M166 139L187 140" stroke="#7b8fab" stroke-width="2" stroke-linecap="round"/>`;
  if (type === 'robot') head = `<path d="M127 56V41" stroke="#8baff0" stroke-width="4"/><circle cx="127" cy="35" r="8" fill="${c}"/><circle cx="127" cy="35" r="13" fill="${c}" opacity=".12"/>
    <rect x="67" y="72" width="18" height="61" rx="9" fill="#769bc6"/><rect x="172" y="72" width="18" height="61" rx="9" fill="#769bc6"/>
    <rect x="76" y="56" width="106" height="108" rx="35" fill="url(#${id}-metal)" stroke="#a6c7eb" stroke-width="2"/>
    <rect x="87" y="77" width="84" height="65" rx="24" fill="#132745"/>
    <g class="pm-eyes"><rect x="102" y="100" width="11" height="19" rx="5" fill="#77d7ff"/><rect x="146" y="100" width="11" height="19" rx="5" fill="#77d7ff"/></g>
    <path d="M120 126Q129 133 138 126" fill="none" stroke="#77d7ff" stroke-width="3" stroke-linecap="round"/><circle cx="127" cy="154" r="3" fill="#7394bb"/>`;
  const palm = type === 'cat' ? '#cbd6ec' : type === 'robot' ? '#b4cee9' : '#efb998';
  const face = custom ? `<defs><clipPath id="${id}-portrait"><rect x="73" y="54" width="110" height="111" rx="42"/></clipPath></defs><rect x="68" y="49" width="120" height="121" rx="46" fill="${c}" opacity=".55"/><image href="${custom}" x="73" y="54" width="110" height="111" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-portrait)"/>` : head;
  return `<svg viewBox="0 0 256 310" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="${id}-skin" x2=".6" y2="1"><stop stop-color="#ffe0bf"/><stop offset="1" stop-color="#edb994"/></linearGradient>
    <linearGradient id="${id}-hoodie" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c}"/><stop offset="1" stop-color="#162c55"/></linearGradient>
    <linearGradient id="${id}-metal" x2=".7" y2="1"><stop stop-color="#e2efff"/><stop offset="1" stop-color="#9bbce0"/></linearGradient>
    <pattern id="${id}-cloth" width="13" height="13" patternUnits="userSpaceOnUse"><rect width="13" height="13" fill="#fff0ed"/><path d="M0 0L13 13M13 0L0 13" stroke="#d27d7b" stroke-width="1.6"/><circle cx="6.5" cy="6.5" r="2" fill="#db9690"/></pattern>
    <filter id="${id}-shadow" x="-40%" y="-20%" width="180%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#020817" flood-opacity=".35"/></filter>
  </defs>
  <ellipse cx="128" cy="285" rx="61" ry="11" fill="#010713" opacity=".3"/>
  <g class="pm-body" filter="url(#${id}-shadow)">
    <path d="M92 231L94 267Q101 278 117 267L122 232M135 232L140 267Q154 277 162 265L164 231" fill="#1d2b43" stroke="#132038" stroke-width="2"/>
    <path d="M94 261L116 261L121 274Q102 281 83 274Q81 266 94 261ZM142 261L162 261Q177 266 173 275Q155 281 138 274Z" fill="#c5d4ea"/><path d="M86 275H119M139 275H173" stroke="#7f98bb" stroke-width="3" stroke-linecap="round"/>
    <g class="pm-arm pm-arm-left"><path d="M90 163Q68 166 60 202L72 211Q84 194 96 192" fill="url(#${id}-hoodie)" stroke="#172f52" stroke-width="2"/><ellipse cx="65" cy="211" rx="11" ry="13" transform="rotate(18 65 211)" fill="${palm}"/><path d="M59 208L60 215" stroke="#a77768" stroke-width="1.5" opacity=".4"/></g>
    <g class="pm-arm pm-arm-right"><path d="M165 163Q188 169 196 200L183 210Q172 190 161 190" fill="url(#${id}-hoodie)" stroke="#172f52" stroke-width="2"/><ellipse cx="190" cy="211" rx="11" ry="13" transform="rotate(-18 190 211)" fill="${palm}"/></g>
    <path d="M94 158Q127 145 163 158Q174 179 172 234Q126 252 84 234Q83 185 94 158Z" fill="url(#${id}-hoodie)" stroke="#172f52" stroke-width="2"/>
    <path d="M95 158Q125 181 162 159" fill="none" stroke="#badcff" stroke-opacity=".24" stroke-width="8"/>
    <path d="M111 169L107 194M144 169L149 194" stroke="#d5e8ff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/><circle cx="107" cy="194" r="2.3" fill="#d6eaff"/><circle cx="149" cy="194" r="2.3" fill="#d6eaff"/>
    <path d="M106 221Q128 226 150 220L155 231Q128 239 101 232Z" fill="#0c1e3c" opacity=".25"/>
    <path d="M88 233Q130 245 171 233" fill="none" stroke="#9dc6f0" stroke-opacity=".2" stroke-width="4"/>
    ${logo ? `<image href="${logo}" x="111" y="184" width="34" height="34" preserveAspectRatio="xMidYMid meet"/>` : `<path d="M114 185H142V204L128 216L114 204Z" fill="#e5f2ff" fill-opacity=".93"/><path d="M117 188H139V203L128 212L117 203Z" fill="none" stroke="${c}" stroke-width="1"/><text x="128" y="201" font-family="Arial,sans-serif" font-size="${badge.length > 7 ? 4.5 : badge.length > 4 ? 6 : 8}" font-weight="800" text-anchor="middle" fill="#14243c">${badge}</text><path d="M123 205H133" stroke="${c}" stroke-width="1"/>`}
    <g class="pm-head">${face}</g>
  </g></svg>`;
}

export function createCompanion(container, initialOptions = {}) {
  if (!(container instanceof Element)) throw new TypeError('A companion container is required.');
  let options = {type:'saudi',color:'#2699e8',badge:'PM',...initialOptions};
  const id = `pm-companion-${++nextId}`;
  const root = document.createElement('div');
  root.className = 'pm-companion-stage';
  root.innerHTML = `<style>
    .pm-companion-stage{position:relative;width:100%;height:100%;min-height:220px;isolation:isolate;overflow:hidden;contain:layout paint}
    .pm-companion-stage .pm-companion-halo{position:absolute;width:70%;height:70%;left:15%;top:10%;border-radius:50%;background:radial-gradient(ellipse,rgba(60,136,255,.13),transparent 68%);pointer-events:none}
    .pm-companion-stage .pm-companion-puppet{position:absolute;left:50%;top:50%;width:min(76%,240px);height:auto;aspect-ratio:256/310;padding:0;border:0;outline:none;background:none;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform;transform:translate(-50%,-50%)}
    .pm-companion-stage .pm-companion-puppet:focus-visible{border-radius:44%;outline:2px solid #81baff;outline-offset:2px}
    .pm-companion-stage .pm-companion-puppet.is-dragging{cursor:grabbing}
    .pm-companion-stage .pm-companion-puppet svg{display:block;width:100%;height:100%;overflow:visible;pointer-events:none}
    .pm-companion-stage .pm-body{transform-origin:128px 272px;animation:pm-breathe 4s ease-in-out infinite}
    .pm-companion-stage .pm-eyes{transform-origin:128px 117px;animation:pm-blink 5.9s infinite}
    .pm-companion-stage .pm-arm-right{transform-origin:163px 168px}
    .pm-companion-stage .is-waving .pm-arm-right{animation:pm-wave .85s ease-in-out 2}
    .pm-companion-stage .is-dragging .pm-body{animation-play-state:paused}
    .pm-companion-stage .pm-interaction-spark{position:absolute;left:50%;top:25%;color:#9ddcff;font:22px sans-serif;pointer-events:none;animation:pm-spark 1s ease-out forwards}
    @keyframes pm-breathe{0%,100%{transform:translateY(0) rotate(-.5deg)}50%{transform:translateY(-4px) rotate(.5deg)}}
    @keyframes pm-blink{0%,42%,46%,76%,80%,100%{transform:scaleY(1)}44%,78%{transform:scaleY(.09)}}
    @keyframes pm-wave{0%,100%{transform:rotate(0deg)}25%,65%{transform:rotate(-110deg)}45%,85%{transform:rotate(-86deg)}}
    @keyframes pm-spark{from{opacity:1;transform:translate(-50%,0) scale(.7)}to{opacity:0;transform:translate(-50%,-40px) scale(1.3)}}
    @media(prefers-reduced-motion:reduce){.pm-companion-stage .pm-body,.pm-companion-stage .pm-eyes,.pm-companion-stage .is-waving .pm-arm-right{animation:none}.pm-companion-stage .pm-interaction-spark{animation-duration:.1s}}
  </style><div class="pm-companion-halo"></div><button class="pm-companion-puppet" type="button"></button>`;
  container.append(root);
  const puppet = root.querySelector('.pm-companion-puppet');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false, animation = 0, waveTimeout = 0;
  let x=0,y=0,vx=0,vy=0,targetX=0,targetY=0,angle=0,drag=null,moved=false,lastFrame=0;
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  function limits() { return {x:Math.max(0,(root.clientWidth-puppet.clientWidth)*.5-9),y:Math.max(0,(root.clientHeight-puppet.clientHeight)*.5-8)}; }
  function frame(time) {
    if(destroyed) return;
    const dt=Math.min(2,(time-(lastFrame||time))/16.667||1);lastFrame=time;
    const bounds=limits();targetX=clamp(targetX,-bounds.x,bounds.x);targetY=clamp(targetY,-bounds.y,bounds.y);
    if(motion.matches){x=targetX;y=targetY;angle=0;vx=0;vy=0;}else{
      vx=(vx+(targetX-x)*.12*dt)*Math.pow(.70,dt);vy=(vy+(targetY-y)*.12*dt)*Math.pow(.70,dt);
      x+=vx*dt;y+=vy*dt;angle+=(clamp(vx*1.8,-13,13)-angle)*.14*dt;
    }
    puppet.style.transform=`translate(calc(-50% + ${x.toFixed(2)}px),calc(-50% + ${y.toFixed(2)}px)) rotate(${angle.toFixed(2)}deg)`;
    if(drag || Math.abs(targetX-x)+Math.abs(targetY-y)+Math.abs(vx)+Math.abs(vy)+Math.abs(angle)>.05) animation=requestAnimationFrame(frame);else {animation=0;lastFrame=0;}
  }
  function animate(){if(!animation)animation=requestAnimationFrame(frame);}
  function interact(kind){options.onInteract?.({kind,type:options.type});}
  function wave(){
    puppet.classList.remove('is-waving');void puppet.offsetWidth;puppet.classList.add('is-waving');
    clearTimeout(waveTimeout);waveTimeout=setTimeout(()=>puppet.classList.remove('is-waving'),1750);
    const spark=document.createElement('span');spark.className='pm-interaction-spark';spark.textContent='✦';root.append(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true});
    interact('tap');
  }
  function down(event){if(event.button!==0 && event.pointerType!=='touch')return;puppet.setPointerCapture(event.pointerId);drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:targetX,y:targetY};moved=false;puppet.classList.add('is-dragging');animate();}
  function move(event){if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)>5)moved=true;targetX=drag.x+dx;targetY=drag.y+dy;animate();}
  function up(event){if(!drag||event.pointerId!==drag.id)return;drag=null;puppet.classList.remove('is-dragging');if(puppet.hasPointerCapture(event.pointerId))puppet.releasePointerCapture(event.pointerId);if(event.type!=='pointercancel'&&!moved)wave();else if(moved)interact('drag');animate();}
  function click(event){if(event.detail===0)wave();}
  function key(event){const deltas={ArrowLeft:[-18,0],ArrowRight:[18,0],ArrowUp:[0,-18],ArrowDown:[0,18]};if(deltas[event.key]){event.preventDefault();targetX+=deltas[event.key][0];targetY+=deltas[event.key][1];animate();interact('keyboard');}}
  puppet.addEventListener('pointerdown',down);puppet.addEventListener('pointermove',move);puppet.addEventListener('pointerup',up);puppet.addEventListener('pointercancel',up);puppet.addEventListener('click',click);puppet.addEventListener('keydown',key);
  function resizePuppet(){puppet.style.width=`${Math.max(90,Math.min(220,root.clientWidth*.68,root.clientHeight*.70))}px`;animate();}
  const resize=new ResizeObserver(resizePuppet);resize.observe(root);resizePuppet();
  function update(next={}){options={...options,...next};puppet.innerHTML=drawing(options,id);puppet.setAttribute('aria-label',options.lang==='en'?'Your study companion. Drag to move, tap to wave.':'رفيق المذاكرة. اسحبه لتحريكه، أو المسه ليلوح لك.');root.style.setProperty('--companion-color',color(options.color));animate();}
  update();
  return {update,wave,destroy(){destroyed=true;cancelAnimationFrame(animation);clearTimeout(waveTimeout);resize.disconnect();root.remove();}};
}
