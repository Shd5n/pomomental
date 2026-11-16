import {countries,universities} from './catalog.js';

export function renderRankings(container,{lang,t,esc,icon,api,profile,online,saveProfile,onAuth,toast}) {
  let dead=false,requestId=0;
  const q=s=>container.querySelector(s);
  const number=n=>new Intl.NumberFormat(lang==='ar'?'ar-SA':'en-GB').format(n);
  const time=seconds=>`${number(Math.floor(seconds/3600))}${t(' س','h')} ${number(Math.floor(seconds%3600/60))}${t(' د','m')}`;
  const school=entry=>{
    if(!entry.university)return t('لم يحدد جامعة بعد','University not set');
    const found=universities.find(u=>u.name===entry.university);
    return lang==='ar'?(found?.nameAr||entry.university):entry.university;
  };
  const person=entry=>esc(entry.displayName||entry.display_name||t('طالب','Student'));
  const country=entry=>{const found=countries.find(c=>c.code===entry.country);return found?t(found.nameAr,found.name):entry.country||'';};
  const initials=entry=>esc((entry.displayName||entry.display_name||'P').trim().split(/\s+/).slice(0,2).map(n=>Array.from(n)[0]).join(''));
  container.innerHTML=`<div class="page-heading ranking-heading"><div><div class="eyebrow">${t('وقت يُحسب، وتقدم يُرى','Time well spent')}</div><h1>${t('رفاق الإنجاز','The study board')}</h1><p>${t('جهد حقيقي من طلاب يشاركونك الطموح.','Real study time. People working toward something.')}</p></div><div class="ranking-mark" aria-hidden="true">${icon('trophy')}</div></div>
  <section class="panel rankings"><div class="ranking-toolbar"><div><h2>${t('ترتيب المذاكرة','Study rankings')}</h2><p class="muted">${t('الترتيب حسب وقت التركيز المسجل','Ranked by recorded focus time')}</p></div><label class="period-field"><span class="sr-only">${t('الفترة','Time period')}</span><select data-period><option value="week">${t('هذا الأسبوع','This week')}</option><option value="month">${t('هذا الشهر','This month')}</option><option value="all">${t('كل الوقت','All time')}</option></select></label></div><div data-rankings aria-live="polite"></div><label class="ranking-opt-in"><span><strong>${t('شارك تقدمك','Share your progress')}</strong><small>${t('أظهر اسمك ودولتك وجامعتك في الترتيب.','Show your name, country, and university on the board.')}</small></span><input type="checkbox" data-opt-in ${profile.leaderboardOptIn?'checked':''}></label></section>`;
  function empty(title,body,signIn=false){q('[data-rankings]').innerHTML=`<div class="ranking-empty"><div class="empty-mark">${icon('book')}</div><h3>${title}</h3><p>${body}</p>${signIn?`<button class="primary" data-rank-signin>${t('تسجيل الدخول','Sign in')}</button>`:''}</div>`;q('[data-rank-signin]')?.addEventListener('click',onAuth);}
  async function load(){
    const id=++requestId;
    q('[data-rankings]').innerHTML=`<div class="ranking-empty" role="status">${t('نرتب الساعات…','Gathering study time…')}</div>`;
    if(!online){empty(t('مكانك هنا','There’s a place for you here'),t('سجل دخولك لتشوف الترتيب وتشارك تقدمك.','Sign in to see the rankings and share your progress.'),true);return;}
    try{
      const result=await api('/leaderboard?period='+q('[data-period]').value);if(dead||id!==requestId)return;
      const rows=result.entries||[];
      if(!rows.length){empty(t('أول خطوة تبدأ بجلسة','It starts with one session'),t('ما فيه نتائج مشتركة لهذه الفترة بعد. أكمل جلستك وشارك تقدمك متى ما حبيت.','No shared time for this period yet. Finish a session and join whenever you’re ready.'));return;}
      const max=Math.max(1,...rows.map(e=>Number(e.seconds||e.totalSeconds||0)));
      q('[data-rankings]').innerHTML=`<div class="ranking-featured">${rows.slice(0,3).map((entry,i)=>`<article class="rank-card rank-${i+1}"><div class="rank-card-top"><span class="rank-seal" aria-label="${t('المركز','Rank')} ${number(i+1)}">${number(i+1)}</span><span class="rank-country">${esc(country(entry))}</span></div><div class="rank-avatar" aria-hidden="true">${initials(entry)}</div><h3>${person(entry)}${entry.isYou?` <span class="you-label">${t('أنت','you')}</span>`:''}</h3><p class="rank-school">${esc(school(entry))}</p><strong class="rank-time">${time(Number(entry.seconds||entry.totalSeconds||0))}</strong><span class="rank-caption">${t('وقت تركيز','focused')}</span></article>`).join('')}</div><div class="rank-list-heading"><span>${t('الطالب والجامعة','Student & university')}</span><span>${t('وقت التركيز','Focus time')}</span></div><ol class="rank-list">${rows.map((entry,i)=>`<li class="rank-row ${entry.isYou?'is-you':''}"><span class="rank-position">${number(i+1)}</span><div class="rank-person"><strong>${person(entry)}${entry.isYou?` <span class="you-label">${t('أنت','you')}</span>`:''}</strong><span class="rank-university">${icon('book')}<span>${esc(school(entry))}</span></span><small>${esc(country(entry))}${entry.university?` · ${entry.universityRelation==='student'?t('يدرس فيها','Current student'):t('يطمح لها','Aiming for this university')}`:''}</small></div><div class="rank-duration"><strong>${time(Number(entry.seconds||entry.totalSeconds||0))}</strong><span class="rank-bar"><i style="width:${Math.max(2,Number(entry.seconds||entry.totalSeconds||0)/max*100)}%"></i></span></div></li>`).join('')}</ol>`;
    }catch{if(!dead&&id===requestId)empty(t('تعذر تحميل الترتيب','Couldn’t load the board'),t('حاول مرة ثانية بعد قليل.','Please try again in a moment.'));}
  }
  q('[data-period]').onchange=load;
  q('[data-opt-in]').onchange=async event=>{
    const input=event.target;if(!online){input.checked=false;onAuth();return;}
    input.disabled=true;
    try{await saveProfile({leaderboardOptIn:input.checked});if(!dead)load();}catch(e){input.checked=!input.checked;toast(e.message);}finally{input.disabled=false;}
  };
  load();return {destroy(){dead=true;}};
}
