/* A deterministic, original night landscape. Each subject owns its own route. */
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#379bff';
const live = new WeakMap();
const seen = new Map();
let sequence=0;
const milestones=[{hours:1,ar:'الشجرة الشائكة',en:'Thorn tree'},{hours:3,ar:'البوابة القديمة',en:'Ancient gate'},{hours:6,ar:'الجسر المكسور',en:'Broken bridge'},{hours:10,ar:'وادي الضباب',en:'Valley of mist'},{hours:20,ar:'قلعة المعرفة',en:'Castle of knowledge'}];
function hash(str){let n=2166136261;for(const c of str)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const tree=(x,y,s,thorn=false)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0L-3-40L-18-58L-20-76L-8-60L-6-88L1-68L14-84L10-59L26-69L17-48L7-36L8 0Z" fill="${thorn?'#475b77':'#102942'}"/><path d="M-2-37L-27-48L-33-63M7-49L31-47L40-58M-4-57L-24-67" fill="none" stroke="${thorn?'#65788c':'#17334f'}" stroke-width="3" stroke-linecap="round"/>${thorn?'<path d="M-19-54L-26-57L-21-48M19-53L24-61L25-51M-4-72L-11-76L-6-65" fill="#9facc0"/>':''}</g>`;
function castle(x,y,id){return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="12" rx="92" ry="24" fill="#255181" opacity=".13"/><path d="M-62 14L-63-43H-48V-51H-35V-43H-24V-70H-16V-84H-8V-70H7V-59H24V-44H37V-56H49V-45H63V14Z" fill="url(#${id}-castle)" stroke="#54779f" stroke-width="1.5"/><path d="M-27-69L-7-102L11-69ZM-68-46L-56-67L-43-46ZM32-56L43-80L56-56Z" fill="#244366" stroke="#6685a8" stroke-width="1"/><path d="M-7-103V-120L15-115L-7-109M43-81V-94L57-90L43-86" fill="#69acdd" stroke="#6999bc" stroke-width="1"/><path d="M-12 14V-9Q-12-27 0-27Q12-27 12-9V14" fill="#0a1428" stroke="#5881a2" stroke-width="2"/><path d="M-2 12V-12" stroke="#b9d8f0" stroke-opacity=".5"/><g fill="#f5d592"><path d="M-54-33h5v11h-5ZM-15-57h5v12h-5ZM0-55h5v12h-5ZM39-42h5v11h-5ZM51-17h4v9h-4ZM-36-12h4v9h-4Z"/></g><path d="M-62-2H-25M17-2H61M-24-33H23" stroke="#507094" opacity=".5"/></g>`;}
function miniCompanion(x,y,type,c){
  const hat=type==='saudi'?'<path d="M-9-20Q0-32 9-20L11-10H-11Z" fill="#f8d9d8"/><path d="M-8-22Q0-26 8-22" fill="none" stroke="#1e2535" stroke-width="3"/>':type==='engineer'?'<path d="M-11-22Q-10-34 0-34Q10-34 11-22Z" fill="#e9b652"/><path d="M-12-22H12" stroke="#f6cd6e" stroke-width="3"/>':type==='girl'?'<path d="M-10-17Q-13-30 0-31Q13-30 10-17L12-8H8L6-23Q-2-20-8-23L-8-8H-12Z" fill="#513a35"/>':'<path d="M-10-20Q-13-31 0-30Q12-29 10-20L7-24Q0-19-8-22Z" fill="#493931"/>';
  return `<g class="pm-journey-traveler" transform="translate(${x} ${y})"><ellipse cx="0" cy="4" rx="17" ry="5" fill="#020815" opacity=".65"/><circle cy="-11" r="27" fill="${c}" opacity=".08"/><path d="M-7-2L-6 3M6-2L7 3" stroke="#b2c8e2" stroke-width="5" stroke-linecap="round"/><path d="M-8-14Q0-18 8-14L10-1Q0 5-10-1Z" fill="${type==='doctor'||type==='saudi'?'#e9edf1':c}" stroke="#a7d4fb" stroke-width=".7"/><circle cy="-19" r="9" fill="#efc09f"/>${hat}<circle cx="-3" cy="-18" r="1.2" fill="#16243a"/><circle cx="3" cy="-18" r="1.2" fill="#16243a"/><path d="M-2-14Q0-12 2-14" fill="none" stroke="#8e5c52" stroke-width="1"/><path d="M-8-10L-13-5M8-10L13-5" stroke="${c}" stroke-width="5" stroke-linecap="round"/></g>`;
}

export function renderJourney(container, initialOptions={}){
  if(!(container instanceof Element))throw new TypeError('A journey container is required.');
  live.get(container)?.destroy();
  let options={seconds:0,subject:'My journey',lang:'ar',mascotType:'saudi',color:'#379bff',...initialOptions};
  const id=`pm-journey-${++sequence}`;
  let timer=0,destroyed=false;
  const root=document.createElement('section');root.className='pm-journey';container.append(root);
  function draw(){
    const ar=options.lang!=='en',seconds=Math.max(0,Number(options.seconds)||0),hours=seconds/3600,c=color(options.color),rng=random(hash(options.subject||''));
    const wobble=(rng()-.5)*28,points=[[94,337],[238,300+wobble],[425,267-wobble],[554,212+wobble],[721,179-wobble],[839,135]];
    const completed=milestones.filter(m=>hours>=m.hours).length,next=milestones[completed];
    const thresholds=[0,...milestones.map(m=>m.hours)];
    const segment=Math.min(completed,4),fraction=completed>=5?1:Math.min(1,(hours-thresholds[segment])/(thresholds[segment+1]-thresholds[segment]));
    const position=[points[segment][0]+(points[segment+1][0]-points[segment][0])*fraction,points[segment][1]+(points[segment+1][1]-points[segment][1])*fraction];
    const path=`M${points.map(p=>p.join(',')).join(' L')}`;
    const stars=Array.from({length:47},()=>{const x=Math.round(rng()*980+10),y=Math.round(rng()*210+10),r=(rng()*.85+.4).toFixed(1);return `<circle cx="${x}" cy="${y}" r="${r}" fill="#c9dcf7" opacity="${(rng()*.5+.15).toFixed(2)}"/>`;}).join('');
    const forest=Array.from({length:18},(_,i)=>tree(i*60+Math.round(rng()*20),333+Math.round(rng()*61),.45+rng()*.55)).join('');
    const labels=milestones.map((m,i)=>`<div class="pm-journey-step ${i<completed?'is-complete':i===completed?'is-next':''}"><span class="pm-journey-step-dot">${i<completed?'✓':String(i+1).padStart(2,'0')}</span><span>${esc(ar?m.ar:m.en)}<small>${m.hours} ${ar?'ساعة':'hours'}</small></span></div>`).join('');
    const remaining=next?Math.max(0,Math.ceil((next.hours*3600-seconds)/60)):0;
    const nextText=next?(ar?`${remaining >= 60 ? `${Math.floor(remaining/60)} س ` : ''}${remaining%60} د حتى ${next.ar}`:`${Math.floor(remaining/60)}h ${remaining%60}m to ${next.en}`):(ar?'وصلت إلى القلعة. هذا أثر التزامك.':'You reached the castle. Your consistency made this.');
    root.setAttribute('dir',ar?'rtl':'ltr');
    root.innerHTML=`<style>
      .pm-journey{width:100%;color:#dbe8fb;font-family:inherit;--journey-accent:${c}}
      .pm-journey-scene{position:relative;overflow:hidden;border:1px solid #27415c;border-radius:20px;background:#081324;isolation:isolate}
      .pm-journey-scene>svg{display:block;width:100%;height:auto;min-height:220px;object-fit:cover}
      .pm-journey-scene-header{position:absolute;inset:20px 22px auto;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;pointer-events:none}
      .pm-journey-scene-header small{display:block;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7297bd;margin-bottom:6px}
      .pm-journey-scene-header strong{font-size:18px;font-weight:600;color:#e4efff}
      .pm-journey-hours{direction:ltr;border:1px solid #2c455e;background:#0e1f35c9;padding:7px 11px;border-radius:9px;font-size:12px;color:#94b6d8;font-variant-numeric:tabular-nums}
      .pm-journey-footer{position:absolute;inset:auto 20px 15px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#9fb6d1;gap:12px;pointer-events:none}
      .pm-journey-footer span:first-child{background:#0a1627b3;border:1px solid #284059;padding:7px 10px;border-radius:8px;backdrop-filter:blur(8px)}
      .pm-journey-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:15px}
      .pm-journey-step{display:flex;align-items:center;gap:8px;font-size:10px;color:#6f849e;line-height:1.4}
      .pm-journey-step small{display:block;font-size:10px;color:#587089;margin-top:3px}
      .pm-journey-step-dot{display:grid;place-items:center;flex:0 0 25px;width:25px;height:25px;border:1px solid #283d54;border-radius:50%;font-size:9px;font-family:Arial,sans-serif;background:#101e31}
      .pm-journey-step.is-next{color:#bcd7f4}.pm-journey-step.is-next .pm-journey-step-dot{border-color:var(--journey-accent);color:#bfe6ff;box-shadow:0 0 12px #359fff22}
      .pm-journey-step.is-complete{color:#8db3c7}.pm-journey-step.is-complete .pm-journey-step-dot{background:#153b43;border-color:#286675;color:#84d7c1}
      .pm-journey-water{animation:pm-water 8s ease-in-out infinite;transform-origin:center}
      .pm-journey-mist{animation:pm-mist 15s ease-in-out infinite alternate}
      .pm-journey-unlock{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);padding:13px 20px;border:1px solid #7abdff73;border-radius:14px;background:#142a46ee;box-shadow:0 14px 40px #02070e99;color:#e7f4ff;text-align:center;font-size:13px;animation:pm-unlock 4.8s ease both;min-width:220px;pointer-events:none}
      .pm-journey-unlock b{display:block;margin-bottom:5px;color:#87c5ff;font-size:24px}
      .pm-journey-slash{stroke:#c8eeff;stroke-width:3;fill:none;stroke-dasharray:160;stroke-dashoffset:160;animation:pm-slash 1s ease forwards;filter:drop-shadow(0 0 5px #60bdff)}
      @keyframes pm-water{50%{opacity:.3;transform:translateX(9px)}}@keyframes pm-mist{to{transform:translateX(22px);opacity:.7}}@keyframes pm-unlock{0%{opacity:0;margin-top:12px}12%,82%{opacity:1;margin-top:0}100%{opacity:0;margin-top:-12px}}@keyframes pm-slash{to{stroke-dashoffset:0;opacity:0}}
      @media(max-width:560px){.pm-journey-scene>svg{min-height:210px;width:100%}.pm-journey-scene-header{inset:14px 14px auto}.pm-journey-scene-header strong{font-size:15px}.pm-journey-scene-header small{font-size:8px}.pm-journey-footer{inset:auto 12px 12px;font-size:9px}.pm-journey-steps{gap:4px}.pm-journey-step{flex-direction:column;text-align:center;font-size:9px;gap:6px}.pm-journey-step small{font-size:9px}}
      @media(prefers-reduced-motion:reduce){.pm-journey-water,.pm-journey-mist,.pm-journey-slash{animation:none}.pm-journey-unlock{animation-duration:.1s}}
    </style><div class="pm-journey-scene"><svg viewBox="0 0 1000 420" role="img" aria-label="${esc(ar?`مسار ${options.subject} إلى القلعة. أنجزت ${completed} من 5 عقبات.`:`${options.subject} path to the castle. ${completed} of 5 obstacles cleared.`)}" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#091325"/><stop offset=".55" stop-color="#132c46"/><stop offset="1" stop-color="#193849"/></linearGradient>
      <linearGradient id="${id}-ground" x2="0" y2="1"><stop stop-color="#102638"/><stop offset="1" stop-color="#08141f"/></linearGradient>
      <linearGradient id="${id}-castle" x2=".8" y2="1"><stop stop-color="#3c5f83"/><stop offset="1" stop-color="#142b46"/></linearGradient>
      <radialGradient id="${id}-moon"><stop stop-color="#b0d4ed" stop-opacity=".22"/><stop offset="1" stop-color="#b0d4ed" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}-path"><stop stop-color="#6381a2"/><stop offset="1" stop-color="#34536d"/></linearGradient>
    </defs><rect width="1000" height="420" fill="url(#${id}-sky)"/>${stars}<circle cx="752" cy="60" r="89" fill="url(#${id}-moon)"/><circle cx="752" cy="60" r="19" fill="#c6dced" opacity=".78"/><circle cx="760" cy="55" r="18" fill="#12263c"/>
      <path d="M0 227L105 137L185 213L287 114L369 178L475 96L582 186L675 119L765 173L880 93L1000 162V420H0Z" fill="#152c44"/>
      <path d="M0 279L116 208L206 262L345 181L450 242L549 163L663 213L799 117L910 180L1000 125V420H0Z" fill="#1a344b"/>
      <path d="M0 309Q113 279 190 294Q299 250 403 269Q530 202 621 209Q726 147 828 142Q908 115 1000 173V420H0Z" fill="url(#${id}-ground)"/>
      <path d="M498 420Q511 340 559 291Q588 260 604 222L637 210Q623 265 607 293Q576 348 579 420Z" fill="#22485c" opacity=".6"/>
      <g class="pm-journey-water" stroke="#5d859c" opacity=".25"><path d="M526 365H566M543 342H571M559 321H582M576 302H595M590 277H609"/></g>
      <path d="${path}" fill="none" stroke="#060e19" stroke-width="25" stroke-linejoin="round" opacity=".6"/><path d="${path}" fill="none" stroke="url(#${id}-path)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#a1bad0" stroke-opacity=".18" stroke-width="1" stroke-dasharray="2 11" stroke-linecap="round"/>
      <path d="M94 337${points.slice(1,completed+1).map(p=>'L'+p.join(' ')).join('')}L${position.join(' ')}" fill="none" stroke="${c}" stroke-opacity=".43" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      ${forest}${castle(839,124,id)}
      ${completed<1?tree(points[1][0],points[1][1]-3,.64,true):`<g transform="translate(${points[1]})"><ellipse cy="-1" rx="12" ry="4" fill="#3c4c4d"/><path d="M-5-2V-11H6V-2" fill="#72828a"/></g>`}
      <g transform="translate(${points[2]})"><path d="M-20 0V-37H-10V0M12 0V-37H22V0M-20-36H22" fill="none" stroke="#576b80" stroke-width="7"/><path d="M-13-28H15M-13-16H15M-5-30V-2M6-30V-2" fill="none" stroke="${completed>=2?'#294151':'#7991a6'}" stroke-width="2" opacity="${completed>=2?.22:1}"/></g>
      <g transform="translate(${points[3]}) rotate(-24)"><path d="M-26 0H-5M${completed>=3?'-5':'9'} 0H31" stroke="#9a8b79" stroke-width="8"/><path d="M-27-9V6M-14-9V6M16-9V6M29-9V6" stroke="#5d615f" stroke-width="3"/><path d="M-28-10Q0-3 30-10" stroke="#8b9c9c" stroke-width="1.5" fill="none"/></g>
      <g class="pm-journey-mist" opacity="${completed>=4?.1:.45}" fill="#8ba6b8"><ellipse cx="${points[4][0]}" cy="${points[4][1]-12}" rx="57" ry="9"/><ellipse cx="${points[4][0]+13}" cy="${points[4][1]-24}" rx="43" ry="7"/></g>
      ${points.slice(1).map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]+11}" r="3" fill="${completed>i?'#92d6df':'#567b9d'}"/>`).join('')}
      ${miniCompanion(position[0],position[1]-3,options.mascotType,c)}
      <path d="M0 397Q87 368 166 389Q235 380 313 406Q416 384 488 411Q623 380 728 400Q863 371 1000 394V420H0Z" fill="#060f1b"/>
    </svg><div class="pm-journey-scene-header"><div><small>${ar?'كل جلسة تفتح طريقًا':'EVERY SESSION OPENS A PATH'}</small><strong>${esc(options.subject)}</strong></div><div class="pm-journey-hours">${hours.toFixed(1)} / 20 ${ar?'س':'h'}</div></div><div class="pm-journey-footer"><span>✦ ${esc(nextText)}</span><span>${completed} / 5 ${ar?'عقبات':'obstacles'}</span></div></div><div class="pm-journey-steps">${labels}</div>`;
    const previous=seen.get(options.subject);
    seen.set(options.subject,completed);
    if(previous!==undefined && completed>previous){
      const scene=root.querySelector('.pm-journey-scene'),toast=document.createElement('div');toast.className='pm-journey-unlock';toast.innerHTML=`<b>✦</b>${esc(ar?`فتحت الطريق! تخطيت ${milestones[completed-1].ar}`:`Path unlocked! You cleared ${milestones[completed-1].en}`)}`;scene.append(toast);
      const svg=scene.querySelector('svg'),slash=document.createElementNS('http://www.w3.org/2000/svg','path'),p=points[completed];slash.setAttribute('d',`M${p[0]-28} ${p[1]+5}Q${p[0]} ${p[1]-42} ${p[0]+31} ${p[1]-55}`);slash.classList.add('pm-journey-slash');svg.append(slash);
      clearTimeout(timer);timer=setTimeout(()=>{toast.remove();slash.remove();},5000);
    }
  }
  const api={update(next={}){if(destroyed)return;options={...options,...next};draw();},destroy(){destroyed=true;clearTimeout(timer);root.remove();if(live.get(container)===api)live.delete(container);}};
  live.set(container,api);draw();return api;
}

export { milestones };
