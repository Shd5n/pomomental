import { createCompanion } from './companion.js';
import { config } from './config.js';

export function renderRooms(container, ctx) {
  const {t,esc,api,toast}=ctx;
  let destroyed=false,roomData=null,busy=false,pollId=null,clockId=null,receivedAt=0,avatars=[],lastPhase='';
  const tr=(ar,en)=>t?t(ar,en):ctx.lang==='en'?en:ar;
  const e=esc||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const q=(s)=>container.querySelector(s);
  const arabicDigits='٠١٢٣٤٥٦٧٨٩';
  const localizeDigits=value=>ctx.lang==='ar'?String(value).replace(/[0-9]/g,d=>arabicDigits[d]):String(value);
  const parseDigits=value=>Number(String(value??'').replace(/[٠-٩]/g,d=>String(arabicDigits.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
  const duration=s=>localizeDigits(`${Math.floor(Math.max(0,s)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,s)%60).toString().padStart(2,'0')}`);
  const hours=s=>`${localizeDigits((Math.max(0,s)/3600).toFixed(1))} ${tr('ساعة','h')}`;
  const notify=message=>toast?.(message);
  const cleanupAvatars=()=>{avatars.forEach(a=>a.destroy());avatars=[];};
  const notifyProgress=()=>{try{Promise.resolve(ctx.onProgress?.()).catch(()=>{});}catch{}};
  function errorMessage(error) {
    const message=String(error?.message||error?.error||'');
    if (/sign|401|auth/i.test(message)) return tr('سجّل الدخول لحفظ الجلسات والمذاكرة مع أصدقائك.','Sign in to save sessions and study with friends.');
    if (/active|current session/i.test(message)) return tr('أنهِ جلسة المذاكرة الحالية أولًا، ثم انضم للمجموعة.','Finish your current study session before joining a group.');
    if (/not found|404/i.test(message)) return tr('لم نعثر على الغرفة. تأكد من رمز الدعوة.','Room not found. Check the invitation code.');
    if (/lock|break/i.test(message)) return tr('الدردشة متاحة أثناء البريك فقط.','Chat opens during breaks only.');
    return message || tr('تعذر الاتصال. حاول مرة أخرى.','Could not connect. Please try again.');
  }
  function showError(error) {
    if(destroyed)return;
    const box=q('[data-error]');
    if(box){box.textContent=errorMessage(error);box.hidden=false;}
    notify(errorMessage(error));
  }
  async function action(button,job) {
    if(busy||destroyed)return;
    busy=true;if(button)button.disabled=true;
    const box=q('[data-error]');if(box)box.hidden=true;
    try{await job();}catch(error){showError(error);}finally{busy=false;if(button?.isConnected)button.disabled=false;}
  }
  function stopIntervals(){clearInterval(pollId);clearInterval(clockId);pollId=clockId=null;}
  function lobby() {
    if(destroyed)return;
    roomData=null;stopIntervals();cleanupAvatars();
    const invite=new URL(location.href).searchParams.get('room')||'';
    container.innerHTML=`<div class="page-heading"><div class="eyebrow">TOGETHER, A LITTLE FURTHER</div><h1>${tr('رفاق المذاكرة','Study together')}</h1><p>${tr('نفس الموضوع. نفس الوقت. وكل دقيقة تُسجَّل لكل شخص.','One topic. One timer. Every person’s focus time counts.')}</p></div>
    <div class="note" data-error role="status" hidden></div>
    <div class="page-grid" style="margin-top:18px">
      <section class="panel panel-pad"><div class="panel-head"><h2>${tr('ابدأ غرفة مذاكرة','Start a study room')}</h2><span class="pill">${tr('جلسة مشتركة','Shared focus')}</span></div>
        <form data-create style="margin-top:22px"><label class="field"><span>${tr('وش الموضوع اللي تدرسون عنه؟','What are you studying?')}</span><input name="subject" required maxlength="100" placeholder="${tr('مثال: IELTS أو القدرات','e.g. IELTS or calculus')}" autocomplete="off"></label>
        <div class="field-row"><label class="field"><span>${tr('التركيز · دقيقة','Focus · minutes')}</span><input name="focus" type="${ctx.lang==='ar'?'text':'number'}" min="1" max="240" value="${localizeDigits(25)}" required inputmode="numeric"></label><label class="field"><span>${tr('البريك · دقيقة','Break · minutes')}</span><input name="break" type="${ctx.lang==='ar'?'text':'number'}" min="1" max="60" value="${localizeDigits(5)}" required inputmode="numeric"></label></div>
        <button class="primary" type="submit" style="width:100%">${tr('إنشاء الغرفة والبدء','Create room & start')}</button></form>
        <p class="limit-notice">${tr('تبدأ الساعة عند إنشاء الغرفة. تُحسب لكل عضو دقائق التركيز منذ انضمامه، دون وقت البريك.','The timer starts when you create the room. Members earn focus time from the moment they join, excluding breaks.')}</p>
      </section>
      <section class="panel panel-pad"><h2>${tr('عندك دعوة؟','Have an invitation?')}</h2><p class="muted" style="margin:12px 0 24px;line-height:1.9">${tr('أدخل رمز الغرفة وانضم لنفس الموضوع والعداد مع رفاقك.','Enter a room code to join your friends’ topic and synchronized timer.')}</p>
        <form data-join><label class="field"><span>${tr('رمز الغرفة','Room code')}</span><input name="code" required pattern="[A-Za-z2-9]{8}" maxlength="8" value="${e(invite)}" placeholder="ABCD2345" autocomplete="off" autocapitalize="characters" spellcheck="false" dir="ltr" style="letter-spacing:4px;text-transform:uppercase"></label><button type="submit" style="width:100%">${tr('انضم للمذاكرة','Join study room')}</button></form>
        <div class="note" style="margin-top:25px">${tr('الدردشة تُفتح في البريك فقط. شعار البريك دائمًا: ممنوع مسك الجوال.','Chat opens only during breaks. The break rule: no phone scrolling.')}</div>
      </section>
      <p class="note full">${tr('أرسل الرمز لأصدقائك بعد تسجيل دخولهم. كل شخص يحتفظ بساعاته، والدردشة تفتح وقت البريك فقط.','Share the code with friends after they sign in. Everyone keeps their own hours, and chat opens during breaks.')}</p>
    </div>`;
    q('[data-create]').addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget,data=new FormData(form);
      action(form.querySelector('button'),async()=>{const focusMinutes=parseDigits(data.get('focus')),breakMinutes=parseDigits(data.get('break'));if(!Number.isFinite(focusMinutes)||!Number.isFinite(breakMinutes)){throw Error(tr('أدخل مدة صحيحة للتركيز والبريك.','Enter valid focus and break durations.'));}const value=await api('/rooms',{subject:data.get('subject'),focusMinutes,breakMinutes});enter(value);notifyProgress();});
    });
    q('[data-join]').addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget,data=new FormData(form);
      action(form.querySelector('button'),async()=>{enter(await api('/rooms/join',{code:String(data.get('code')).trim().toUpperCase()}));notifyProgress();});
    });
  }
  function calculatePhase() {
    if(!roomData)return null;
    const now=roomData.serverTime+(Date.now()-receivedAt);
    const focus=roomData.room.focus_minutes*60,rest=roomData.room.break_minutes*60,cycle=focus+rest;
    const elapsed=Math.max(0,(now-roomData.room.started_at)/1000),offset=elapsed%cycle;
    return {phase:offset<focus?'focus':'break',remaining:Math.ceil((offset<focus?focus:cycle)-offset),cycle:Math.floor(elapsed/cycle)+1};
  }
  function tick() {
    if(destroyed||!roomData)return;
    const phase=calculatePhase(),isBreak=phase.phase==='break';
    const clock=q('[data-clock]');if(clock)clock.textContent=duration(phase.remaining);
    const badge=q('[data-phase]');if(badge)badge.textContent=isBreak?tr('وقت البريك','Break time'):tr('وقت التركيز','Focus time');
    const cycle=q('[data-cycle]');if(cycle)cycle.textContent=`${tr('الجولة','Round')} ${localizeDigits(phase.cycle)}`;
    const chat=q('[data-chat-text]'),send=q('[data-send]');
    if(chat)chat.disabled=!isBreak;if(send)send.disabled=!isBreak||busy;
    const locked=q('[data-chat-locked]');if(locked){locked.hidden=isBreak;locked.style.display=isBreak?'none':'grid';}
    const messages=q('[data-messages]');if(messages)messages.hidden=!isBreak;
    const notice=q('[data-break-notice]');if(notice)notice.hidden=!isBreak;
    if(lastPhase && lastPhase!==phase.phase){lastPhase=phase.phase;poll();}else lastPhase=phase.phase;
  }
  function renderPeopleAndMessages() {
    if(destroyed||!roomData)return;
    cleanupAvatars();
    const members=q('[data-members]');
    members.innerHTML=roomData.members.map((member,index)=>`<div class="participant"><div data-member-avatar="${index}" style="width:48px;height:55px;flex:none"></div><div><strong style="font-size:12px">${e(member.display_name)} ${member.isYou?`<span class="muted">(${tr('أنت','you')})</span>`:''}</strong><div style="font-size:10px;color:${member.online?'#8bccae':'#8c9aaf'};margin-top:5px">${member.online?tr('متصل الآن','Here now'):tr('بعيد حاليًا','Away')}</div></div><small>${hours(member.elapsed_seconds)}</small></div>`).join('');
    roomData.members.forEach((member,index)=>{const el=q(`[data-member-avatar="${index}"]`);if(el)avatars.push(createCompanion(el,{...member.avatar,lang:ctx.lang}));});
    const count=q('[data-member-count]');if(count)count.textContent=localizeDigits(roomData.members.length);
    const messages=q('[data-messages]');
    const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<50;
    const rows=roomData.messages||[];
    messages.innerHTML=rows.length?rows.map((message,index)=>`<div class="message" style="${message.isYou?'border-inline-start:2px solid #64c7e2;':''}"><div class="message-avatar" data-message-avatar="${index}"></div><div class="body"><small>${e(message.display_name)} · ${new Date(message.created_at).toLocaleTimeString(ctx.lang==='ar'?'ar-SA':'en-GB',{hour:'2-digit',minute:'2-digit'})}</small><p>${e(message.text)}</p></div></div>`).join(''):`<div class="empty">${tr('خذ نفسًا، وقل مرحبًا لرفاقك.','Take a breath. Say hello to your study friends.')}</div>`;
    rows.forEach((message,index)=>{const el=q(`[data-message-avatar="${index}"]`);if(el)avatars.push(createCompanion(el,{...message.avatar,lang:ctx.lang}));});
    if(atBottom)messages.scrollTop=messages.scrollHeight;
    tick();
  }
  function enter(value) {
    if(destroyed)return;
    roomData=value;receivedAt=Date.now();lastPhase='';stopIntervals();cleanupAvatars();
    container.innerHTML=`<div class="page-heading"><div class="eyebrow">YOUR FOCUS CIRCLE</div><h1>${e(value.room.subject)}</h1><p>${tr('العداد متزامن مع الجميع. الوقت يُحفظ تلقائيًا باسم هذا الموضوع.','Everyone shares one timer. Your focus time saves automatically under this topic.')}</p></div>
      <div class="note" data-error role="status" hidden></div>
      <div class="page-grid" style="margin-top:18px">
        <section class="panel panel-pad" style="text-align:center"><div class="panel-head"><span class="pill" data-phase></span><small data-cycle></small></div>
          <div class="room-clock" data-clock aria-live="off">--:--</div><p class="muted" style="font-size:12px">${tr('دقيقة واحدة، خطوة أقرب.','One minute. One step closer.')}</p>
          <div class="break-notice" data-break-notice hidden><strong>${tr('ممنوع مسك الجوال','No phone scrolling')}</strong><br>${tr('قوم وتمدد، اشرب ماء، وأرح عينيك بعيدًا عن الشاشة.','Stand up, stretch, drink water, and look away from the screen.')}</div>
          <div style="border-top:1px solid var(--line);margin-top:24px;padding-top:20px"><small>${tr('رمز الدعوة','Invitation code')}</small><div class="room-code" style="margin:10px 0">${e(value.code)}</div><button data-copy class="quiet-button">${tr('نسخ دعوة: تعال ذاكر معي','Copy study invitation')}</button><button data-copy-code class="quiet-button">${tr('نسخ الرمز','Copy code')}</button></div>
          <p class="limit-notice">${tr('يحتاج أصدقاؤك حسابًا في التطبيق للانضمام.','Your friends need an app account to join.')}</p>
          <button data-leave style="margin-top:20px;width:100%;color:#e4aaaa">${tr('مغادرة وحفظ وقتي','Leave & save my time')}</button>
        </section>
        <section class="panel panel-pad chat"><div class="panel-head"><h2>${tr('دردشة البريك','Break chat')}</h2><span class="pill">${tr('بريك فقط','Breaks only')}</span></div>
          <div data-chat-locked class="empty" style="flex:1;display:grid;place-content:center"><span style="font-size:28px;margin-bottom:12px">◈</span><strong>${tr('نركز الآن، نسولف في البريك.','Focus now. Catch up at the break.')}</strong><span style="font-size:12px">${tr('الدردشة مغلقة أثناء المذاكرة.','Chat is locked during study time.')}</span></div>
          <div class="messages" data-messages></div>
          <form class="chat-form" data-chat><input data-chat-text aria-label="${tr('رسالتك','Your message')}" maxlength="500" required placeholder="${tr('رسالة قصيرة لرفاق المذاكرة…','A quick message for your friends…')}" autocomplete="off"><button class="primary" data-send type="submit">${tr('إرسال','Send')}</button></form>
        </section>
        <section class="panel panel-pad full"><div class="panel-head"><h2>${tr('رفاق الغرفة','People in this room')}</h2><span class="pill" data-member-count></span></div><div data-members style="margin-top:10px"></div><p class="limit-notice">${tr('يُحتسب وقت التركيز أثناء بقائك متصلًا بالغرفة. عند انقطاع الاتصال، تُستبعد الفجوات الطويلة لحماية دقة الإحصائيات.','Focus counts while you stay connected to the room. Long offline gaps are excluded to keep study records accurate.')}</p></section>
      </div>`;
    q('[data-copy]').addEventListener('click',()=>action(q('[data-copy]'),async()=>{
      const link=config.publicSiteUrl?new URL('./focus.html',config.publicSiteUrl):new URL('./focus.html',location.href);link.searchParams.set('room',roomData.code);
      const startValue=Number(roomData.room.started_at)||Date.parse(roomData.room.started_at),startedAt=new Date(startValue),focusEndsAt=new Date(startedAt.getTime()+Number(roomData.room.focus_minutes)*60000);
      const formatTime=value=>value.toLocaleTimeString(ctx.lang==='ar'?'ar-SA':'en-GB',{hour:'2-digit',minute:'2-digit'});
      const invitation=tr('تعال ذاكر معي في PomoMental 📚','Come study with me on PomoMental 📚')+'\n'+tr('موضوعنا: ','Our topic: ')+roomData.room.subject+'\n'+tr('تبدأ الجلسة: ','Session starts: ')+formatTime(startedAt)+'\n'+tr('ينتهي التركيز الأول: ','First focus block ends: ')+formatTime(focusEndsAt)+'\n'+tr('تركيز: ','Focus: ')+localizeDigits(roomData.room.focus_minutes)+tr(' دقيقة',' minutes')+' · '+tr('بريك: ','Break: ')+localizeDigits(roomData.room.break_minutes)+tr(' دقيقة',' minutes')+'\n'+link.href;await copyText(invitation);notify(tr('نسخنا الدعوة بالرابط والموضوع والوقت. أرسلها لرفيقك 📚','Invitation copied with the link, topic, and time. Share it with your study buddy 📚'));
    }));
    q('[data-copy-code]').addEventListener('click',()=>action(q('[data-copy-code]'),async()=>{await copyText(roomData.code);notify(tr('تم نسخ رمز الغرفة','Room code copied'));}));
    q('[data-leave]').addEventListener('click',()=>action(q('[data-leave]'),async()=>{await api(`/rooms/${roomData.code}/leave`,{});lobby();notifyProgress();notify(tr('تم حفظ وقت المذاكرة','Study time saved'));}));
    q('[data-chat]').addEventListener('submit',event=>{
      event.preventDefault();const input=q('[data-chat-text]'),text=input.value.trim();if(!text)return;
      action(q('[data-send]'),async()=>{const next=await api(`/rooms/${roomData.code}/messages`,{text});if(destroyed)return;roomData=next;receivedAt=Date.now();input.value='';renderPeopleAndMessages();});
    });
    renderPeopleAndMessages();clockId=setInterval(tick,1000);pollId=setInterval(poll,20000);
  }
  async function copyText(text){
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}
    const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';container.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw Error(tr('انسخ الرمز الظاهر يدويًا.','Please copy the visible code manually.'));
  }
  let polling=false;
  async function poll() {
    if(destroyed||!roomData||polling||busy)return;
    polling=true;const code=roomData.code;
    try{
      const value=await api(`/rooms/${code}/heartbeat`,{});
      if(destroyed||roomData?.code!==code)return;roomData=value;receivedAt=Date.now();renderPeopleAndMessages();const box=q('[data-error]');if(box)box.hidden=true;
      notifyProgress();
    }catch(error){showError(error);}finally{polling=false;}
  }
  async function initialize(){
    container.innerHTML=`<div class="loading">${tr('نجهز مساحة المذاكرة…','Preparing your study space…')}</div>`;
    try{
      const state=await api('/state');if(destroyed)return;
      if(state.rooms?.length){enter(await api(`/rooms/${state.rooms[0].code}`));poll();}else lobby();
    }catch(error){lobby();showError(error);}
  }
  initialize();
  return {destroy(){destroyed=true;stopIntervals();cleanupAvatars();}};
}
