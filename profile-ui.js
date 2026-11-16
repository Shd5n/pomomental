import {countries, universities} from './catalog.js';
import {validDisplayName} from './account-policy.js';

export function profileFields({t,esc,profile={},welcome=false}) {
  return `<label class="field"><span>${t('بأي اسم نناديك؟','What should we call you?')}</span><input name="displayName" maxlength="40" minlength="2" required autocomplete="nickname" placeholder="${t('الاسم اللي تحبه','Your preferred name')}" value="${esc(welcome && profile.displayName==='Student'?'':profile.displayName||'')}"><small>${t('هذا الاسم يظهر لرفاقك وفي الترتيب إذا شاركت فيه.','Your study friends will see this name. Rankings are optional.')}</small></label>
  <label class="field"><span>${t('دولتك','Your country')}</span><select name="country">${countries.map(c=>`<option value="${c.code}" ${profile.country===c.code?'selected':''}>${esc(t(c.nameAr,c.name))}</option>`).join('')}</select></label>
  <label class="field"><span>${t('جامعتك أو الجامعة اللي تطمح لها','Your university or the one you’re aiming for')}</span><input name="university" maxlength="200" list="pm-university-choices" value="${esc(profile.university||'')}" placeholder="${t('ابحث باسم الجامعة','Search for a university')}" autocomplete="off"><datalist id="pm-university-choices"></datalist></label>
  <label class="field"><span>${t('علاقتك بالجامعة','Your connection')}</span><select name="universityRelation"><option value="aspiring" ${profile.universityRelation!=='student'?'selected':''}>${t('أطمح للدراسة فيها','I’m aiming to study here')}</option><option value="student" ${profile.universityRelation==='student'?'selected':''}>${t('أدرس فيها','I study here')}</option></select></label>`;
}

export function wireUniversitySearch(container,lang) {
  const input=container.querySelector('[name=university]'), list=container.querySelector('#pm-university-choices');
  if(!input||!list)return;
  const update=()=>{
    const term=input.value.trim().toLocaleLowerCase();
    list.replaceChildren(...universities.filter(u=>!term||u.name.toLocaleLowerCase().includes(term)||(u.nameAr||'').includes(term)).slice(0,25).map(u=>{
      const option=document.createElement('option');option.value=u.name;option.label=lang==='ar'?u.nameAr||u.name:u.name;return option;
    }));
  };
  input.addEventListener('input',update);update();
}

export function readProfileForm(form) {
  const data=new FormData(form), displayName=String(data.get('displayName')||'').trim();
  if(!validDisplayName(displayName))return null;
  return {displayName,country:String(data.get('country')),university:String(data.get('university')||'').trim(),universityRelation:data.get('universityRelation')==='student'?'student':'aspiring',onboardingCompleted:true};
}

export function renderWelcome(container,{t,esc,lang,profile,saveProfile,onComplete}) {
  let dead=false;
  container.innerHTML=`<section class="welcome-card panel"><div class="welcome-visual" aria-hidden="true"><img src="./icon-192.png" width="68" height="68"><span>PomoMental</span></div><div class="eyebrow">${t('خلّنا نتعرف عليك','A space of your own')}</div><h1>${t('أهلًا، وش نناديك؟','First, make yourself at home.')}</h1><p class="muted">${t('اسمك وطموحك، والباقي ناخذه جلسة جلسة.','Choose a name and a university. We’ll take the rest one session at a time.')}</p><form data-welcome>${profileFields({t,esc,profile,welcome:true})}<p data-welcome-error class="auth-error" role="alert" hidden></p><button type="submit" class="primary">${t('جاهز، نبدأ','Make it mine')}</button></form></section>`;
  wireUniversitySearch(container,lang);
  container.querySelector('[data-welcome]').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]'),error=form.querySelector('[data-welcome-error]');
    const patch=readProfileForm(form);error.hidden=true;
    if(!patch){error.textContent=t('اكتب اسمًا بين حرفين و٤٠ حرفًا.','Choose a name between 2 and 40 characters.');error.hidden=false;return;}
    button.disabled=true;
    try{await saveProfile(patch);if(!dead)onComplete();}catch(e){if(!dead){error.textContent=e.message;error.hidden=false;}}finally{if(button.isConnected)button.disabled=false;}
  };
  return {destroy(){dead=true;}};
}
