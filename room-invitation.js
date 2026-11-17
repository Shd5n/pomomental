export function formatRoomMoment(ms,lang='en',timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const date=new Date(Number(ms));
  const day=new Intl.DateTimeFormat(lang==='ar'?'ar-SA-u-ca-gregory':'en-US',{day:'numeric',month:'short',timeZone}).format(date);
  let time=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true,timeZone}).format(date);
  if(lang==='ar')time=time.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  return `${day} · ${time}`;
}
export function studyInvitation(room,code,baseUrl,lang='en',timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const ar=lang==='ar',n=v=>ar?String(v).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):String(v);
  const link=new URL('focus.html',baseUrl);link.searchParams.set('room',code);
  return [ar?'هلا! وش رايك نذاكر سوا؟':'Hey! Up for a study session together?',
    (ar?'موضوعنا اليوم: ':'Our topic: ')+room.subject,
    (ar?'نبدأ: ':'Starts: ')+formatRoomMoment(room.started_at,lang,timeZone),
    (ar?'ونخلّص: ':'Wraps up: ')+(room.ends_at?formatRoomMoment(room.ends_at,lang,timeZone):(ar?'نحددها سوا':'We’ll decide together')),
    ar?`${n(room.planned_cycles||4)} جولات، كل جولة ${n(room.focus_minutes)} دقيقة تركيز وبينها ${n(room.break_minutes)} دقايق بريك.`:`${n(room.planned_cycles||4)} rounds of ${n(room.focus_minutes)} min focus, with ${n(room.break_minutes)} min breaks.`,
    (ar?'التوقيت: ':'Timezone: ')+timeZone,
    ar?'خذ لك موية وجهّز كتبك، ننتظرك في PomoMental:':'Grab some water and your notes. See you in PomoMental:',link.href].join('\n');
}
export const roomChatOpen=phase=>phase==='waiting'||phase==='break';
