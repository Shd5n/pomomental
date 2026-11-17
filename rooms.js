import { staticCompanion } from './companion.js';
import { config } from './config.js';
import { roomPhase } from './room-time.js';
import {formatRoomMoment,studyInvitation,roomChatOpen} from './room-invitation.js';
import {renderRoomSounds} from './room-sounds.js';

export function renderRooms(container, ctx) {
  const {t,esc,api,toast}=ctx;
  let schedulingAvailable=false,destroyed=false,roomData=null,busy=false,pollId=null,clockId=null,receivedAt=0,lastPhase='',membersKey='',messagesKey='';
  const tr=(ar,en)=>t?t(ar,en):ctx.lang==='en'?en:ar;
  const e=esc||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const q=(s)=>container.querySelector(s);
  const arabicDigits='٠١٢٣٤٥٦٧٨٩';
  const localizeDigits=value=>ctx.lang==='ar'?String(value).replace(/[0-9]/g,d=>arabicDigits[d]):String(value);
  const parseDigits=value=>Number(String(value??'').replace(/[٠-٩]/g,d=>String(arabicDigits.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
  const duration=s=>localizeDigits(`${Math.floor(Math.max(0,s)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,s)%60).toString().padStart(2,'0')}`);
  const hours=s=>`${localizeDigits((Math.max(0,s)/3600).toFixed(1))} ${tr('ساعة','h')}`;
  const notify=message=>toast?.(message);

  const notifyProgress=()=>{try{Promise.resolve(ctx.onProgress?.()).catch(()=>{});}catch{}};
  function errorMessage(error) {
    const message=String(error?.message||error?.error||'');
    if (/sign|401|auth/i.test(message)) return tr('سجّل الدخول لحفظ الجلسات والمذاكرة مع أصدقائك.','Sign in to save sessions and study with friends.');
    if (/active|current session/i.test(message)) return tr('أنهِ جلسة المذاكرة الحالية أولًا، ثم انضم للمجموعة.','Finish your current study session before joining a group.');
    if (/not found|404/i.test(message)) return tr('لم نعثر على الغرفة. تأكد من رمز الدعوة.','Room not found. Check the invitation code.');
    if (/lock|break/i.test(message)) return tr('الدردشة متاحة وقت الانتظار والبريك.','Chat opens while waiting and during breaks.');
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
    roomData=null;stopIntervals();
    const invite=new URL(location.href).searchParams.get('room')||'';
    container.innerHTML=`<div class="page-heading"><div class="eyebrow">TOGETHER, A LITTLE FURTHER</div><h1>${tr('رفاق المذاكرة','Study together')}</h1><p>${tr('نفس الموضوع. نفس الوقت. وكل دقيقة تُسجَّل لكل شخص.','One topic. One timer. Every person’s focus time counts.')}</p></div>
    <div class="note" data-error role="status" hidden></div>
    <div class="page-grid" style="margin-top:18px">
      <section class="panel panel-pad"><div class="panel-head"><h2>${tr('ابدأ غرفة مذاكرة','Start a study room')}</h2><span class="pill">${tr('جلسة مشتركة','Shared focus')}</span></div>
        <form data-create style="margin-top:22px"><label class="field"><span>${tr('وش الموضوع اللي تدرسون عنه؟','What are you studying?')}</span><input name="subject" required maxlength="100" placeholder="${tr('مثال: IELTS أو القدرات','e.g. IELTS or calculus')}" autocomplete="off"></label>
        <div class="field-row"><label class="field"><span>${tr('التركيز · دقيقة','Focus · minutes')}</span><input name="focus" type="${ctx.lang==='ar'?'text':'number'}" min="1" max="240" value="${localizeDigits(25)}" required inputmode="numeric"></label><label class="field"><span>${tr('البريك · دقيقة','Break · minutes')}</span><input name="break" type="${ctx.lang==='ar'?'text':'number'}" min="1" max="60" value="${localizeDigits(5)}" required inputmode="numeric"></label></div>
        <div class="field-row"><label class="field"><span>${tr('نبدأ بعد · دقيقة','Start in · minutes')}</span><input name="wait" type="${ctx.lang==='ar'?'text':'number'}" min="1" max="60" value="${localizeDigits(5)}" required inputmode="numeric"></label><label class="field"><span>${tr('عدد الجولات','Focus rounds')}</span><input name="cycles" type="${ctx.lang==='ar'?'text':'number'}" min="1" max="12" value="${localizeDigits(4)}" required inputmode="numeric"></label></div>
        <p class="room-schedule-preview" data-schedule-preview></p><button class="primary" type="submit" style="width:100%">${tr('إنشاء غرفة الانتظار','Create waiting room')}</button></form>
        <p class="limit-notice">${tr('أنت تحدد مهلة الانتظار للجميع. تبدأ المذاكرة تلقائيًا عند انتهاء العدّاد، ووقت الانتظار لا يُحسب.','You choose the countdown for everyone. Focus starts automatically when it ends. Waiting and breaks never count as study time.')}</p>
      </section>
      <section class="panel panel-pad"><h2>${tr('عندك دعوة؟','Have an invitation?')}</h2><p class="muted" style="margin:12px 0 24px;line-height:1.9">${tr('أدخل رمز الغرفة وانضم لنفس الموضوع والعداد مع رفاقك.','Enter a room code to join your friends’ topic and synchronized timer.')}</p>
        <form data-join><label class="field"><span>${tr('رمز الغرفة','Room code')}</span><input name="code" required pattern="[A-Za-z2-9]{8}" maxlength="8" value="${e(invite)}" placeholder="ABCD2345" autocomplete="off" autocapitalize="characters" spellcheck="false" dir="ltr" style="letter-spacing:4px;text-transform:uppercase"></label><button type="submit" style="width:100%">${tr('انضم للمذاكرة','Join study room')}</button></form>
        <div class="note" style="margin-top:25px">${tr('نسولف قبل البداية وفي البريك. تُمسح رسائل الغرفة بعد انتهاء الجلسة.','Chat while waiting and during breaks. Room messages expire when the session ends.')}</div>
      </section>
      <p class="note full">${tr('أرسل الرمز لأصدقائك بعد تسجيل دخولهم. كل شخص يحتفظ بساعاته، والدردشة تفتح وقت الانتظار والبريك.','Share the code with friends after they sign in. Everyone keeps their own hours, and chat opens while waiting and during breaks.')}</p>
    </div>`;
    const preview=()=>{const data=new FormData(q('[data-create]')),f=parseDigits(data.get('focus')),b=parseDigits(data.get('break')),w=parseDigits(data.get('wait')),c=parseDigits(data.get('cycles'));q('[data-schedule-preview]').textContent=tr('انتظار ','Wait ')+localizeDigits(w)+tr(' د · المذاكرة والبريك: ',' min · Focus and breaks: ')+localizeDigits(c*f+(c-1)*b)+tr(' دقيقة',' min');};
    q('[data-create]').addEventListener('input',preview);preview();
    q('[data-create]').addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget,data=new FormData(form);
      action(form.querySelector('button'),async()=>{const focusMinutes=parseDigits(data.get('focus')),breakMinutes=parseDigits(data.get('break')),waitMinutes=parseDigits(data.get('wait')),cycles=parseDigits(data.get('cycles'));if(![focusMinutes,breakMinutes,waitMinutes,cycles].every(Number.isInteger)||focusMinutes<1||focusMinutes>240||breakMinutes<1||breakMinutes>60||waitMinutes<1||waitMinutes>60||cycles<1||cycles>12)throw Error(tr('تحقق من مدة التركيز والانتظار وعدد الجولات.','Check your focus time, countdown, and rounds.'));if(!schedulingAvailable)throw Error(tr('غرف الانتظار قيد التحديث. جرّب لاحقًا.','Waiting rooms are being updated. Please try again shortly.'));const value=await api('/rooms',{subject:data.get('subject'),focusMinutes,breakMinutes,waitMinutes,cycles});enter(value);notifyProgress();});
    });
    q('[data-join]').addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget,data=new FormData(form);
      action(form.querySelector('button'),async()=>{enter(await api('/rooms/join',{code:String(data.get('code')).trim().toUpperCase()}));notifyProgress();});
    });
  }
  function calculatePhase() {
    if(!roomData)return null;
    return roomPhase(roomData.room,roomData.serverTime+(Date.now()-receivedAt));
  }
  function tick() {
    if(destroyed||!roomData)return;
    const phase=calculatePhase(),isBreak=phase.phase==='break',chatOpen=roomChatOpen(phase.phase);
    const clock=q('[data-clock]');if(clock)clock.textContent=duration(phase.remaining);
    const badge=q('[data-phase]');if(badge)badge.textContent=phase.phase==='waiting'?tr('نبدأ بعد','Starting in'):phase.phase==='complete'?tr('اكتملت الجلسة','Session complete'):isBreak?tr('وقت البريك','Break time'):tr('وقت التركيز','Focus time');
    const hint=q('[data-phase-hint]');if(hint)hint.textContent=phase.phase==='waiting'?tr('جهّز كتبك وماءك. نبدأ كلنا مع نهاية العدّاد.','Get your notes and water ready. Everyone starts when the countdown ends.'):phase.phase==='complete'?tr('يعطيكم العافية. تم حفظ وقت التركيز.','Good work. Your focus time has been saved.'):isBreak?tr('قم من مكانك وخذ استراحة قصيرة.','Get up and take a short break.'):tr('موضوع واحد. انتباهك هنا.','One topic. Your attention, here.');
    q('[data-room-timer]')?.setAttribute('data-mode',phase.phase);
    const cycle=q('[data-cycle]');if(cycle)cycle.textContent=phase.phase==='waiting'?tr('غرفة الانتظار','Waiting room'):`${tr('الجولة','Round')} ${localizeDigits(phase.cycle)} / ${localizeDigits(roomData.room.planned_cycles||4)}`;
    const chat=q('[data-chat-text]'),send=q('[data-send]');
    if(chat)chat.disabled=!chatOpen;if(send)send.disabled=!chatOpen||busy;
    const locked=q('[data-chat-locked]');if(locked){locked.hidden=chatOpen;locked.style.display=chatOpen?'none':'grid';locked.querySelector('strong').textContent=phase.phase==='complete'?tr('خلصت الجلسة، يعطيكم العافية!','Session finished. Good work!'):tr('نركز الآن، نسولف في البريك.','Focus now. Catch up at the break.');locked.querySelector('[data-chat-hint]').textContent=phase.phase==='complete'?tr('انتهى سجل الدردشة مع الجلسة.','This session’s chat history has expired.'):tr('الدردشة مغلقة أثناء المذاكرة.','Chat is locked during study time.');}
    const messages=q('[data-messages]');if(messages){messages.hidden=!chatOpen;if(phase.phase==='complete'){messages.replaceChildren();roomData.messages=[];}}if(phase.phase==='complete'&&chat)chat.value='';
    const notice=q('[data-break-notice]');if(notice)notice.hidden=!isBreak;
    if(lastPhase && lastPhase!==phase.phase){lastPhase=phase.phase;poll();}else lastPhase=phase.phase;
  }
  function renderPeopleAndMessages() {
    if(destroyed||!roomData)return;

    const members=q('[data-members]');
    const peopleKey=JSON.stringify(roomData.members.map(m=>[m.user_id,m.display_name,m.avatar,m.online,m.isYou,hours(m.elapsed_seconds)]));
    if(membersKey!==peopleKey){membersKey=peopleKey;members.innerHTML=roomData.members.map((member,index)=>`<div class="participant"><div class="room-avatar">${staticCompanion(member.avatar)}</div><div><strong style="font-size:12px">${e(member.display_name)} ${member.isYou?`<span class="muted">(${tr('أنت','you')})</span>`:''}</strong><div style="font-size:10px;color:${member.online?'#8bccae':'#8c9aaf'};margin-top:5px">${member.online?tr('متصل الآن','Here now'):tr('بعيد حاليًا','Away')}</div></div><small>${hours(member.elapsed_seconds)}</small></div>`).join('');

    }
    const count=q('[data-member-count]');if(count)count.textContent=localizeDigits(roomData.members.length);
    const messages=q('[data-messages]');
    const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<50;
    const rows=roomData.messages||[];
    const rowsKey=JSON.stringify(rows);
    if(messagesKey!==rowsKey){messagesKey=rowsKey;messages.innerHTML=rows.length?rows.map((message,index)=>`<div class="message" style="${message.isYou?'border-inline-start:2px solid #64c7e2;':''}"><div class="room-avatar message-avatar">${staticCompanion(message.avatar)}</div><div class="body"><small>${e(message.display_name)} · ${new Date(message.created_at).toLocaleTimeString(ctx.lang==='ar'?'ar-SA':'en-GB',{hour:'numeric',minute:'2-digit',hour12:true})}</small><p>${e(message.text)}</p></div></div>`).join(''):`<div class="empty">${tr('خذ نفسًا، وقل مرحبًا لرفاقك.','Take a breath. Say hello to your study friends.')}</div>`;

    if(atBottom)messages.scrollTop=messages.scrollHeight;
    }
    tick();
  }
  const formatMoment=ms=>formatRoomMoment(ms,ctx.lang);
  function enter(value) {
    if(destroyed)return;
    roomData=value;receivedAt=Date.now();lastPhase='';membersKey='';messagesKey='';stopIntervals();
    container.innerHTML=`<div class="page-heading"><div class="eyebrow">YOUR FOCUS CIRCLE</div><h1>${e(value.room.subject)}</h1><p>${tr('العداد متزامن مع الجميع. الوقت يُحفظ تلقائيًا باسم هذا الموضوع.','Everyone shares one timer. Your focus time saves automatically under this topic.')}</p></div>
      <div class="note" data-error role="status" hidden></div>
      <div class="page-grid" style="margin-top:18px">
        <section class="panel panel-pad room-timer-panel" data-room-timer style="text-align:center"><div class="panel-head"><span class="pill" data-phase></span><small data-cycle></small></div>
          <div class="room-clock" data-clock aria-live="off">--:--</div><p class="room-phase-hint muted" data-phase-hint></p><div class="room-schedule"><span>${tr('البداية','Starts')}<strong>${formatMoment(value.room.started_at)}</strong></span><span>${tr('النهاية','Ends')}<strong>${value.room.ends_at?formatMoment(value.room.ends_at):'—'}</strong></span></div>
          <div class="break-notice" data-break-notice hidden><strong>${tr('ممنوع مسك الجوال','No phone scrolling')}</strong><br>${tr('قوم وتمدد، اشرب ماء، وأرح عينيك بعيدًا عن الشاشة.','Stand up, stretch, drink water, and look away from the screen.')}</div>
          <div style="border-top:1px solid var(--line);margin-top:24px;padding-top:20px"><small>${tr('رمز الدعوة','Invitation code')}</small><div class="room-code" style="margin:10px 0">${e(value.code)}</div><button data-copy class="quiet-button">${tr('نسخ دعوة: تعال ذاكر معي','Copy study invitation')}</button><button data-copy-code class="quiet-button">${tr('نسخ الرمز','Copy code')}</button></div>
          <p class="limit-notice">${tr('يحتاج أصدقاؤك حسابًا في التطبيق للانضمام.','Your friends need an app account to join.')}</p>
          <button data-leave style="margin-top:20px;width:100%;color:#e4aaaa">${tr('مغادرة وحفظ وقتي','Leave & save my time')}</button>
        </section>
        <section class="panel panel-pad chat"><div class="panel-head"><h2>${tr('سوالف الغرفة','Room chat')}</h2><span class="pill">${tr('انتظار وبريك','Waiting & breaks')}</span></div>
          <div data-chat-locked class="empty" style="flex:1;display:grid;place-content:center"><span style="font-size:28px;margin-bottom:12px">◈</span><strong>${tr('نركز الآن، نسولف في البريك.','Focus now. Catch up at the break.')}</strong><span data-chat-hint style="font-size:12px">${tr('الدردشة مغلقة أثناء المذاكرة.','Chat is locked during study time.')}</span></div>
          <div class="messages" data-messages></div>
          <form class="chat-form" data-chat><input data-chat-text aria-label="${tr('رسالتك','Your message')}" maxlength="500" required placeholder="${tr('رسالة قصيرة لرفاق المذاكرة…','A quick message for your friends…')}" autocomplete="off"><button class="primary" data-send type="submit">${tr('إرسال','Send')}</button></form>
        </section>
        <section class="panel panel-pad full" data-personal-sounds></section>
        <section class="panel panel-pad full"><div class="panel-head"><h2>${tr('رفاق الغرفة','People in this room')}</h2><span class="pill" data-member-count></span></div><div data-members style="margin-top:10px"></div><p class="limit-notice">${tr('يُحتسب وقت التركيز أثناء بقائك متصلًا بالغرفة. عند انقطاع الاتصال، تُستبعد الفجوات الطويلة لحماية دقة الإحصائيات.','Focus counts while you stay connected to the room. Long offline gaps are excluded to keep study records accurate.')}</p></section>
      </div>`;
    q('[data-copy]').addEventListener('click',()=>action(q('[data-copy]'),async()=>{
      const invitation=studyInvitation(roomData.room,roomData.code,config.publicSiteUrl||new URL('./',location.href).href,ctx.lang);await copyText(invitation);notify(tr('نسخنا الدعوة بالموضوع وموعد البداية والنهاية.','Invitation copied with the topic, start, and finish time.'));
    }));
    q('[data-copy-code]').addEventListener('click',()=>action(q('[data-copy-code]'),async()=>{await copyText(roomData.code);notify(tr('تم نسخ رمز الغرفة','Room code copied'));}));
    q('[data-leave]').addEventListener('click',()=>action(q('[data-leave]'),async()=>{await api(`/rooms/${roomData.code}/leave`,{});lobby();notifyProgress();notify(tr('تم حفظ وقت المذاكرة','Study time saved'));}));
    q('[data-chat]').addEventListener('submit',event=>{
      event.preventDefault();const input=q('[data-chat-text]'),text=input.value.trim();if(!text)return;
      action(q('[data-send]'),async()=>{const next=await api(`/rooms/${roomData.code}/messages`,{text});if(destroyed)return;roomData=next;receivedAt=Date.now();input.value='';renderPeopleAndMessages();});
    });
    renderRoomSounds(q('[data-personal-sounds]'),{audio:ctx.audio,lang:ctx.lang,esc:e,toast:notify});
    renderPeopleAndMessages();clockId=setInterval(tick,1000);pollId=setInterval(poll,4000);
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
      if(calculatePhase().phase==='complete')stopIntervals();
      notifyProgress();
    }catch(error){showError(error);}finally{polling=false;}
  }
  async function initialize(){
    container.innerHTML=`<div class="loading">${tr('نجهز مساحة المذاكرة…','Preparing your study space…')}</div>`;
    try{
      const state=await api('/state');if(destroyed)return;schedulingAvailable=state.capabilities?.roomScheduling===true;
      if(state.rooms?.length){enter(await api(`/rooms/${state.rooms[0].code}`));poll();}else lobby();
    }catch(error){lobby();showError(error);}
  }
  initialize();
  return {destroy(){destroyed=true;stopIntervals();}};
}
