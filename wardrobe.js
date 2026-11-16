import { universities, countries, catalogInfo } from './catalog.js';
import { createCompanion } from './companion.js';

const safeColor = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#008540';
const safeImage = value => typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value) ? value : '';
const regions = [
  ['all','كل الجامعات','All universities'], ['US','أمريكا','United States'],
  ['GB','بريطانيا','United Kingdom'], ['Scotland','اسكتلندا','Scotland'],
  ['CA','كندا','Canada'], ['AU','أستراليا','Australia'],
  ['SG','سنغافورة','Singapore'], ['SA','السعودية','Saudi Arabia'],
];
const types = [['saudi','سعودي','Saudi'],['anime','أنمي أصلي','Original anime'],['cat','قط فضائي','Space cat'],['robot','روبوت','Robot']];
const searchIndex = universities.map(u => `${u.name} ${u.nameAr} ${u.short} ${u.website || ''}`.normalize('NFKD').toLowerCase());

export function renderWardrobe(container, ctx) {
  const t = ctx.t || ((ar,en) => ctx.lang === 'en' ? en : ar);
  const e = ctx.esc || (value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const lang = ctx.lang === 'en' ? 'en' : 'ar', profile = ctx.profile || {};
  let initialAvatar = typeof profile.avatar === 'object' && profile.avatar ? profile.avatar : {type:profile.avatar || 'saudi'};
  let selected = universities.find(u => u.id === profile.university || u.name === profile.university || u.short === profile.university) || universities[0];
  let avatar = {type:types.some(([type]) => type === initialAvatar.type) ? initialAvatar.type : 'saudi', color:safeColor(initialAvatar.color || selected.color),badge:String(initialAvatar.badge || selected.short).slice(0,14),image:safeImage(initialAvatar.image),logo:safeImage(initialAvatar.logo)};
  let country = countries.some(c=>c.code===profile.country) ? profile.country : 'SA';
  let filter='all',query='',limit=30,searchTimer=0,dirty=false,destroyed=false,saving=false;
  const controller = new AbortController(), readers = new Set();
  const on = (el,event,fn) => el.addEventListener(event,fn,{signal:controller.signal});
  const root=document.createElement('div');root.className='wardrobe-page';root.dir=lang==='ar'?'rtl':'ltr';
  root.innerHTML=`<style>
    .wardrobe-page .wardrobe-preview-card{background:radial-gradient(ellipse at 50% 42%,#1b304b 0,#101a29 67%);position:relative}
    .wardrobe-page .wardrobe-preview-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .wardrobe-page .wardrobe-preview-head .pill{font-size:9px}
    .wardrobe-page .custom-preview{height:315px;margin:0 -12px}
    .wardrobe-page .wardrobe-university-name{text-align:center;font-size:16px;font-weight:500;line-height:1.7;min-height:28px}
    .wardrobe-page .wardrobe-university-english{text-align:center;line-height:1.6;font-size:10px;color:#7893b0;margin:3px 0 12px;min-height:16px}
    .wardrobe-page .wardrobe-palette-status{font-size:10px;line-height:1.8;text-align:center;color:#8cabc6;margin-top:13px}
    .wardrobe-page .wardrobe-divider{height:1px;background:#25354c;margin:20px 0}
    .wardrobe-page .wardrobe-search-wrap{position:relative;margin-top:18px}
    .wardrobe-page .wardrobe-search-wrap input{padding-inline-start:38px}
    .wardrobe-page .wardrobe-search-icon{position:absolute;inset-inline-start:14px;top:13px;color:#7e9db9;pointer-events:none}
    .wardrobe-page .wardrobe-directory-filter{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:10px 0}
    .wardrobe-page .wardrobe-result-count{font-size:10px;color:#7890aa;white-space:nowrap;min-width:65px;text-align:end}
    .wardrobe-page .university-list{max-height:350px;min-height:180px;margin:12px 0}
    .wardrobe-page .university-option{position:relative}
    .wardrobe-page .university-option>span:nth-child(2){min-width:0;flex:1}
    .wardrobe-page .university-option b{overflow-wrap:anywhere;line-height:1.6}
    .wardrobe-page .university-option .university-check{color:#8cd5e6;font-size:16px;margin-inline-start:auto}
    .wardrobe-page .wardrobe-more{display:block;width:100%;padding:9px;font-size:11px;background:transparent}
    .wardrobe-page .wardrobe-directory-note{font-size:10px;color:#7891ab;line-height:1.9;margin-top:15px}
    .wardrobe-page .wardrobe-directory-note details{margin-top:7px}
    .wardrobe-page .wardrobe-directory-note summary{cursor:pointer;color:#a7c2da}
    .wardrobe-page .wardrobe-color-row{display:flex;gap:10px;align-items:center}
    .wardrobe-page input[type=color]{width:49px;height:45px;padding:5px;flex:none;cursor:pointer}
    .wardrobe-page .wardrobe-hex{direction:ltr;font-family:monospace;text-transform:uppercase}
    .wardrobe-page .wardrobe-custom-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
    .wardrobe-page .wardrobe-file-card{padding:14px;border:1px dashed #344b65;border-radius:12px;background:#0f1b2b}
    .wardrobe-page .wardrobe-file-card .field{margin-bottom:9px}
    .wardrobe-page .wardrobe-file-card input{background:transparent;padding:9px 0;border:0;font-size:10px}
    .wardrobe-page .wardrobe-file-status{font-size:10px;color:#8da3bd;min-height:18px;display:block;line-height:1.8}
    .wardrobe-page .wardrobe-file-clear{font-size:10px;padding:5px 0;background:transparent;border:0;color:#83c7dd;margin-top:6px}
    .wardrobe-page .wardrobe-save-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:22px;padding-top:20px;border-top:1px solid #26364b}
    .wardrobe-page .wardrobe-save-row .primary{min-width:155px}
    .wardrobe-page .wardrobe-save-status{font-size:11px;color:#7e96b0;line-height:1.8}
    .wardrobe-page .wardrobe-custom-description{font-size:11px;line-height:1.8;margin-top:7px;color:#829ab5}
    .wardrobe-page .wardrobe-reset-color{padding:3px 0;border:0;background:none;color:#8fc6de;font-size:10px;margin-top:7px}
    .wardrobe-page .wardrobe-choice-note{font-size:10px;color:#728ba5;line-height:1.8;margin-top:11px}
    @media(max-width:620px){.wardrobe-page .custom-preview{height:285px}.wardrobe-page .wardrobe-custom-grid{grid-template-columns:1fr;gap:14px}.wardrobe-page .wardrobe-save-row{align-items:stretch;flex-direction:column}.wardrobe-page .wardrobe-save-row .primary{width:100%}.wardrobe-page .wardrobe-directory-filter{grid-template-columns:1fr}.wardrobe-page .wardrobe-result-count{text-align:start}.wardrobe-page .university-list{max-height:310px}}
  </style>
  <div class="page-heading"><div class="eyebrow">${e(t('رفيق الرحلة','YOUR STUDY COMPANION'))}</div><h1>${e(t('رفيق يشبه طموحك','A companion for your ambition'))}</h1><p>${e(t('اختر رفيقك، ألبسه ألوان حلمك، وخذ الخطوة التالية معًا.','Choose your companion, dress for your dream, and take the next step together.'))}</p></div>
  <div class="page-grid">
    <section class="panel panel-pad wardrobe-preview-card"><div class="wardrobe-preview-head"><h2>${e(t('غرفة الملابس','The wardrobe'))}</h2><span class="pill">${e(t('معاينة مباشرة','LIVE PREVIEW'))}</span></div><div class="custom-preview" data-preview></div><h3 class="wardrobe-university-name" data-university-name></h3><p class="wardrobe-university-english" data-university-english></p><p class="companion-hint">${e(t('اسحب رفيقك بلطف، أو المسه ليحيّيك','Drag your companion gently, or tap to say hello'))}</p><div class="wardrobe-divider"></div><div class="choice-row">${types.map(([type,ar,en])=>`<button type="button" data-type="${type}" aria-pressed="${avatar.type===type}" class="${avatar.type===type?'selected':''}">${e(t(ar,en))}</button>`).join('')}</div><p class="wardrobe-choice-note">${e(t('أربع شخصيات أصلية. تستطيع رفع صورة شخصيتك المفضلة لتخصيص وجه الرفيق.','Four original characters. Upload your favorite character image to personalize your companion’s face.'))}</p><p class="wardrobe-palette-status" data-palette-status></p></section>
    <section class="panel panel-pad"><div class="panel-head"><h2>${e(t('جامعتك القادمة','Your next destination'))}</h2><span class="pill">${universities.length.toLocaleString(lang)} ${e(t('مؤسسة','institutions'))}</span></div><div class="wardrobe-search-wrap"><span class="wardrobe-search-icon" aria-hidden="true">⌕</span><input type="search" data-university-search placeholder="${e(t('ابحث عن جامعة أو اختصارها…','Search a university or abbreviation…'))}" aria-label="${e(t('ابحث عن جامعة','Search universities'))}" autocomplete="off" spellcheck="false"></div><div class="wardrobe-directory-filter"><select data-region aria-label="${e(t('دولة الجامعة','University region'))}">${regions.map(([code,ar,en])=>`<option value="${code}">${e(t(ar,en))}</option>`).join('')}</select><span class="wardrobe-result-count" data-result-count aria-live="polite"></span></div><div class="university-list" data-university-list aria-label="${e(t('نتائج الجامعات','University results'))}"></div><button class="wardrobe-more" type="button" data-show-more>${e(t('عرض المزيد','Show more'))}</button><div class="wardrobe-directory-note"><span>${e(t('الاختصار على الزي شارة شخصية، وليس الشعار الرسمي للجامعة.','The initials on the costume are a personal badge, not an official university logo.'))}</span><details><summary>${e(t('عن دليل الجامعات والألوان','About the directory and colors'))}</summary><p>${e(lang==='ar'?catalogInfo.noticeAr:catalogInfo.notice)}</p><a href="${e(catalogInfo.sourceUrl)}" target="_blank" rel="noopener noreferrer">${e(catalogInfo.source)}</a> · ${e(catalogInfo.retrieved)}</details></div></section>
    <section class="panel panel-pad full"><h2>${e(t('التفاصيل الصغيرة، بطريقتك','Make the little details yours'))}</h2><p class="wardrobe-custom-description">${e(t('غيّر اللون أو الشارة، أو أضف صورتك وشعارك الخاص.','Adjust the color and badge, or add your own image and crest.'))}</p><div class="wardrobe-custom-grid"><div><div class="field-row"><label class="field"><span>${e(t('لون الزي','Costume color'))}</span><div class="wardrobe-color-row"><input type="color" data-color value="${e(avatar.color)}" aria-label="${e(t('اختيار لون الزي','Choose costume color'))}"><input data-hex class="wardrobe-hex" value="${e(avatar.color)}" maxlength="7" pattern="#[0-9a-fA-F]{6}" aria-label="${e(t('رمز لون الزي','Costume hex color'))}" spellcheck="false"></div><button class="wardrobe-reset-color" type="button" data-reset-color>${e(t('استعادة لون الجامعة','Reset university color'))}</button></label><label class="field"><span>${e(t('شارة الزي','Costume badge'))}</span><input data-badge maxlength="14" value="${e(avatar.badge)}" placeholder="KFUPM" aria-label="${e(t('نص شارة الزي','Costume badge text'))}"></label></div><label class="field"><span>${e(t('دولتك في لوحة المتصدرين','Your country on the leaderboard'))}</span><select data-country>${countries.map(c=>`<option value="${e(c.code)}" ${c.code===country?'selected':''}>${e(c.flag)} ${e(lang==='ar'?c.nameAr:c.name)}</option>`).join('')}</select></label></div><div class="field-row"><div class="wardrobe-file-card"><label class="field"><span>${e(t('صورة وجه الرفيق','Companion portrait'))}</span><input class="file-input" data-upload="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><small class="wardrobe-file-status" data-image-status></small><button class="wardrobe-file-clear" type="button" data-clear="image">${e(t('إزالة الصورة','Remove portrait'))}</button></div><div class="wardrobe-file-card"><label class="field"><span>${e(t('شعار مخصص على الزي','Custom costume crest'))}</span><input class="file-input" data-upload="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><small class="wardrobe-file-status" data-logo-status></small><button class="wardrobe-file-clear" type="button" data-clear="logo">${e(t('إزالة الشعار','Remove crest'))}</button></div></div></div><div class="wardrobe-save-row"><span class="wardrobe-save-status" data-save-status aria-live="polite">${e(t('ستظهر شخصيتك نفسها في جلسات المذاكرة والمحادثات.','Your companion will appear in your study sessions and chats.'))}</span><button class="primary" type="button" data-save>${e(t('حفظ رفيقي','Save my companion'))}</button></div></section>
  </div>`;
  container.append(root);
  const $ = selector=>root.querySelector(selector);
  const companion=createCompanion($('[data-preview]'),{...avatar,lang,onInteract:({kind})=>{if(kind==='tap')ctx.toast?.(t('أنا معك، خطوة بخطوة ✦','I’m with you, one step at a time ✦'));}});
  function setDirty(){dirty=true;$('[data-save-status]').textContent=t('لديك تعديلات لم تُحفظ بعد.','You have unsaved changes.');}
  function preview(){
    companion.update({...avatar,lang});
    $('[data-university-name]').textContent=lang==='ar'?selected.nameAr:selected.name;
    $('[data-university-english]').textContent=lang==='ar'&&selected.nameAr!==selected.name?selected.name:'';
    $('[data-color]').value=avatar.color;$('[data-hex]').value=avatar.color;$('[data-badge]').value=avatar.badge;
    const isUniversityColor=avatar.color.toLowerCase()===selected.color.toLowerCase();
    let status=!isUniversityColor?t('لون خصصته بنفسك','Your custom costume color'):selected.paletteVerified?t('لون الجامعة موثّق','Verified university color'):selected.paletteKind==='curated'?t('لوحة مستوحاة من الجامعة؛ لم تُوثّق هنا رسميًا','University-inspired palette; not officially verified here'):t('لوحة زي قابلة للتخصيص؛ ليست ألوانًا رسمية موثقة','Editable costume palette; not verified official colors');
    status+=' · '+(avatar.logo?t('شعار رفعته أنت','Your uploaded crest'):t('شارة اختصار','Initials badge'));
    $('[data-palette-status]').textContent=status;
    root.querySelectorAll('[data-type]').forEach(button=>{const active=button.dataset.type===avatar.type;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
    for(const field of ['image','logo']){
      $(`[data-${field}-status]`).textContent=avatar[field]?t('صورة مخصصة جاهزة','Custom image ready'):t('PNG / JPG / WebP / GIF · حتى 250 كيلوبايت','PNG / JPG / WebP / GIF · up to 250 KB');
      $(`[data-clear="${field}"]`).hidden=!avatar[field];
    }
  }
  function renderResults(){
    const needles=query.trim().normalize('NFKD').toLowerCase().split(/\s+/).filter(Boolean);
    const matches=universities.filter((u,index)=>(filter==='all'||(filter==='Scotland'?u.region==='Scotland':u.country===filter))&&needles.every(needle=>searchIndex[index].includes(needle)));
    $('[data-result-count]').textContent=`${matches.length.toLocaleString(lang)} ${t('نتيجة','results')}`;
    const list=$('[data-university-list]');
    if(!matches.length)list.innerHTML=`<div class="empty">${e(t('لا توجد نتيجة بهذا الاسم. جرّب الاختصار أو غيّر الدولة.','No universities found. Try an abbreviation or change the region.'))}</div>`;
    else list.innerHTML=matches.slice(0,limit).map(u=>{const countryName=countries.find(c=>c.code===u.country);return `<button class="university-option ${u.id===selected.id?'selected':''}" type="button" data-university="${e(u.id)}" aria-pressed="${u.id===selected.id}"><span class="mini-badge" style="background:${safeColor(u.color)};font-size:${u.short.length>7?'5':'7'}px">${e(u.short.slice(0,12))}</span><span><b>${e(lang==='ar'?u.nameAr:u.name)}</b><small>${e(u.region==='Scotland'?t('اسكتلندا','Scotland'):countryName?(lang==='ar'?countryName.nameAr:countryName.name):u.country)} · ${e(u.short)}</small></span>${u.id===selected.id?'<span class="university-check" aria-hidden="true">✓</span>':''}</button>`;}).join('');
    $('[data-show-more]').hidden=matches.length<=limit;
  }
  on(root,'click',event=>{
    const button=event.target.closest('button');if(!button||!root.contains(button))return;
    if(button.dataset.type){avatar.type=button.dataset.type;avatar.image='';preview();setDirty();}
    else if(button.dataset.university){selected=universities.find(u=>u.id===button.dataset.university)||selected;avatar={...avatar,color:safeColor(selected.color),badge:selected.short.slice(0,14),logo:''};preview();renderResults();setDirty();}
    else if(button.hasAttribute('data-show-more')){limit+=30;const scroll=$('[data-university-list]').scrollTop;renderResults();$('[data-university-list]').scrollTop=scroll;}
    else if(button.hasAttribute('data-reset-color')){avatar.color=safeColor(selected.color);preview();setDirty();}
    else if(button.dataset.clear){avatar[button.dataset.clear]='';$(`[data-upload="${button.dataset.clear}"]`).value='';preview();setDirty();}
  });
  on($('[data-university-search]'),'input',event=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=event.target.value;limit=30;renderResults();},120);});
  on($('[data-region]'),'change',event=>{filter=event.target.value;limit=30;renderResults();});
  on($('[data-color]'),'input',event=>{avatar.color=safeColor(event.target.value);preview();setDirty();});
  on($('[data-hex]'),'change',event=>{if(/^#[0-9a-f]{6}$/i.test(event.target.value)){avatar.color=event.target.value;preview();setDirty();}else{event.target.value=avatar.color;ctx.toast?.(t('اكتب لونًا بصيغة #008540','Enter a color in the form #008540'));}});
  on($('[data-badge]'),'input',event=>{avatar.badge=event.target.value.slice(0,14);companion.update({...avatar,lang});setDirty();});
  on($('[data-country]'),'change',event=>{country=event.target.value;setDirty();});
  root.querySelectorAll('[data-upload]').forEach(input=>on(input,'change',async()=>{
    const file=input.files?.[0],field=input.dataset.upload;if(!file)return;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){ctx.toast?.(t('اختر صورة PNG أو JPG أو WebP أو GIF.','Choose a PNG, JPG, WebP or GIF image.'));input.value='';return;}
    if(file.size>250*1024){ctx.toast?.(t('الصورة أكبر من 250 كيلوبايت. صغّرها ثم جرّب مجددًا.','This image exceeds 250 KB. Resize it and try again.'));input.value='';return;}
    const reader=new FileReader();readers.add(reader);
    reader.onload=()=>{
      readers.delete(reader);if(destroyed)return;
      const data=safeImage(reader.result);if(!data){ctx.toast?.(t('تعذر قراءة الصورة.','This image could not be read.'));return;}
      const probe=new Image();probe.onload=()=>{if(destroyed)return;if(probe.naturalWidth>4096||probe.naturalHeight>4096){ctx.toast?.(t('صغّر أبعاد الصورة إلى 4096 بكسل أو أقل.','Resize this image to 4096 pixels or less.'));return;}avatar[field]=data;preview();setDirty();};probe.onerror=()=>{if(!destroyed)ctx.toast?.(t('الملف ليس صورة صالحة. جرّب صورة أخرى.','This file is not a valid image. Try another image.'));};probe.src=data;
    };
    reader.onerror=()=>{readers.delete(reader);if(!destroyed)ctx.toast?.(t('تعذر فتح الصورة.','The image could not be opened.'));};reader.readAsDataURL(file);
  }));
  on($('[data-save]'),'click',async()=>{
    if(saving||destroyed)return;saving=true;const button=$('[data-save]');button.disabled=true;button.textContent=t('جارٍ الحفظ…','Saving…');
    try{
      await ctx.saveProfile({avatar:{...avatar},university:selected.id,country});
      if(destroyed)return;dirty=false;$('[data-save-status]').textContent=t('حُفظ رفيقك. حلمك معك في الجلسة القادمة.','Companion saved. Your dream comes with you into the next session.');ctx.toast?.(t('تم حفظ رفيقك ✦','Your companion is saved ✦'));
    }catch(error){if(!destroyed)ctx.toast?.(error?.message||t('تعذر الحفظ. حاول مرة أخرى.','Could not save. Please try again.'));}
    finally{saving=false;if(!destroyed){button.disabled=false;button.textContent=t('حفظ رفيقي','Save my companion');}}
  });
  preview();renderResults();
  return {destroy(){destroyed=true;controller.abort();clearTimeout(searchTimer);readers.forEach(reader=>reader.abort());readers.clear();companion.destroy();root.remove();},get hasUnsavedChanges(){return dirty;}};
}
