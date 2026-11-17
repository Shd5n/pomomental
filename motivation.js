// Original study prompts inspired by these talks, not quotations or transcript extracts.
const talks=[
  ['Carol Dweck','carol_dweck_the_power_of_believing_that_you_can_improve',[
    ['ما فهمتها للحين؟ هذا مكان البداية، مو نهاية الطريق.','Not clear yet? That is a starting point, not a verdict.'],
    ['جرّب طريقة ثانية قبل ما تحكم على قدرتك.','Try another approach before judging your ability.'],
    ['السؤال الصعب يعطيك فرصة تتعلم شيئًا جديدًا.','A difficult question gives you something new to learn.'],
    ['خلّ هدفك تفهم أكثر، مو تثبت إنك تعرف كل شيء.','Aim to understand more, not to prove you know everything.'],
    ['عدّل محاولتك على ضوء الخطأ، ثم جرّب من جديد.','Use the mistake to adjust your next attempt.'],
    ['قدرتك اليوم مو سقف قدرتك بكرة.','Your ability today does not set tomorrow’s ceiling.'],
  ]],
  ['Angela Duckworth','angela_lee_duckworth_grit_the_power_of_passion_and_perseverance',[
    ['طموحك الطويل يحتاج خطوات تقدر ترجع لها كل يوم.','A lasting goal needs steps you can return to daily.'],
    ['مو كل جلسة بتكون قوية؛ الاستمرار له قيمته.','Not every session feels strong. Showing up still matters.'],
    ['إذا خف الحماس، خلّ خطوتك صغيرة وسهلة التكرار.','When enthusiasm fades, make your next step small and repeatable.'],
    ['الموهبة بداية، والممارسة تعطيها فرصة تكبر.','Talent is a beginning. Practice gives it room to grow.'],
    ['يوم صعب ما يختصر رحلتك كلها.','One difficult day does not define your whole journey.'],
    ['تذكّر ليش بدأت، واشتغل على الجزء اللي قدامك.','Remember why you started, then work on the part in front of you.'],
  ]],
  ['Tim Urban','tim_urban_inside_the_mind_of_a_master_procrastinator',[
    ['الموضوع اللي تأجله يستحق موعد بداية واضح.','The task you keep postponing deserves a clear start time.'],
    ['لا تنتظر ضغط آخر ليلة؛ افتح أول صفحة الحين.','Do not wait for last-minute pressure. Open the first page.'],
    ['قبل ما تفتح تبويب جديد، ارجع لسؤالك الحالي.','Before opening another tab, return to your current question.'],
    ['الهدف اللي ما له موعد يضيع بسهولة وسط المشاغل.','A goal without a date can disappear among distractions.'],
    ['انتبه للي تتركه لبعدين، خصوصًا الأشياء اللي تهمك.','Notice what you keep leaving for later, especially what matters.'],
    ['عط المهمة المؤجلة مساحة في جلسة اليوم.','Make room for that postponed task in today’s session.'],
  ]],
  ['Eduardo Briceño','eduardo_briceno_how_to_get_better_at_the_things_you_care_about',[
    ['كثرة الشغل وحدها ما تكفي؛ لاحظ وش تحتاج تطوّر.','More work alone is not enough. Notice what needs improving.'],
    ['اختَر مهارة واحدة اليوم وتمرّن عليها بوضوح.','Choose one skill today and practise it deliberately.'],
    ['في وقت التدريب، اسمح لنفسك تغلط وتراجع.','During practice, give yourself room to make and review mistakes.'],
    ['بعد الحل، اسأل نفسك: وش أغيّر في المحاولة الجاية؟','After a solution, ask what you would change next time.'],
    ['خل بعض وقتك للتعلّم، مو بس لإنهاء المطلوب.','Reserve some time for learning, not only finishing tasks.'],
    ['ملاحظة مفيدة ممكن تغيّر جلسة كاملة.','One useful piece of feedback can change a whole session.'],
  ]],
  ['Laura Vanderkam','laura_vanderkam_how_to_gain_control_of_your_free_time',[
    ['حط الشيء المهم في جدولك قبل ما يمتلئ بالباقي.','Schedule what matters before everything else fills the space.'],
    ['مو لازم يوم فاضي؛ تحتاج مساحة واضحة لخطوتك.','You do not need an empty day, just space for one step.'],
    ['راجع أسبوعك كاملًا، مو أصعب ساعة فيه.','Look at your whole week, not only its busiest hour.'],
    ['هدفك له مكان في الوقت المتاح، ولو كان صغيرًا.','Your goal deserves a place in the time you have.'],
    ['اختَر أولويتك قبل ما تختار مدة الجلسة.','Choose your priority before choosing your session length.'],
    ['سجّل وقتك عشان تعرف وين تروح ساعاتك فعلًا.','Track your time to see where your hours actually go.'],
  ]],
  ['Matt Cutts','matt_cutts_try_something_new_for_30_days',[
    ['جرّب عادة مذاكرة صغيرة لمدة محددة، وشوف وش يتغير.','Try a small study habit for a set period and observe.'],
    ['بدل الوعد الكبير، اختَر تجربة تقدر تبدأها اليوم.','Replace a huge promise with an experiment you can start today.'],
    ['شهر من الخطوات الصغيرة يعطيك شيئًا تراجعه وتتعلم منه.','A month of small steps gives you something to learn from.'],
    ['خلك واقعي في هدفك اليومي عشان تقدر تعيده بكرة.','Keep your daily goal realistic enough to repeat tomorrow.'],
    ['إذا ودك تتعلم شيء جديد، عطه فرصة في جدولك.','Give something new a real chance in your schedule.'],
    ['التجربة القصيرة تساعدك تعرف العادة اللي تناسبك.','A short experiment helps you find a habit that fits.'],
  ]],
  ['Jia Jiang','jia_jiang_what_i_learned_from_100_days_of_rejection',[
    ['اسأل عن اللي مو واضح؛ الخوف من الرد مو إجابة.','Ask about what is unclear. Fear of an answer is not an answer.'],
    ['طلب المساعدة يفتح احتمالات ما تشوفها وأنت ساكت.','Asking for help can reveal options you cannot see alone.'],
    ['رد واحد ما يحدد قيمتك ولا كل فرصك.','One response does not define your worth or every opportunity.'],
    ['جرّب تسأل سؤالًا كنت مترددًا تسأله.','Try asking a question you have been hesitant to ask.'],
    ['عدم الموافقة مو دائمًا نهاية الحوار.','A refusal does not always have to end the conversation.'],
    ['الشجاعة تبدأ أحيانًا بطلب بسيط وواضح.','Sometimes courage begins with a small, clear request.'],
  ]],
  ['Brittany Packnett Cunningham','brittany_packnett_cunningham_how_to_build_your_confidence_and_spark_it_in_others',[
    ['الثقة تنمو، مو شرط تكون كاملة قبل البداية.','Confidence can grow. It need not be complete before you begin.'],
    ['عط نفسك إذن تحاول حتى لو كنت مترددًا.','Give yourself permission to try, even while feeling unsure.'],
    ['شجّع رفيقك على المحاولة؛ الدعم يفرق.','Encourage your study partner to try. Support makes a difference.'],
    ['الخطوة اللي تسويها اليوم فرصة تبني ثقتك.','Today’s action is an opportunity to build your confidence.'],
    ['مو لازم تعرف كل الإجابات عشان تشارك بسؤالك.','You can contribute a question without knowing every answer.'],
    ['خل مساحة المذاكرة مكانًا آمنًا للتجربة والسؤال.','Make your study space welcoming to questions and attempts.'],
  ]],
];
const originals=[
  ['خذها سؤال سؤال، ما يحتاج تحمل المنهج كله في بالك.','Take it one question at a time, not a whole syllabus.'],
  ['سوّ اللي تقدر عليه اليوم، وخلي لبكرة خطوته.','Do what you can today. Tomorrow can have its own step.'],
  ['الصفحة اللي تتعبك اليوم ممكن تصير سهلة مع المراجعة.','Today’s difficult page may feel familiar after review.'],
  ['إذا ضعت، ارجع لآخر نقطة فهمتها.','If you feel lost, return to the last point you understood.'],
  ['التقدم الهادئ يظل تقدمًا.','Quiet progress is still progress.'],
  ['قوم خذ لك موية، ورجّع انتباهك بهدوء.','Have some water and bring your attention back gently.'],
  ['حلك مو واضح؟ اكتب خطواتك وشوف وين انقطعت الفكرة.','Write out your steps to find where the idea broke down.'],
  ['قبل البريك، اترك لنفسك ملاحظة عن الخطوة الجاية.','Before your break, leave a note about your next step.'],
  ['وقت الراحة محسوب في الخطة، خذه على راحتك.','Rest is part of the plan. Take your break.'],
  ['المقارنة المفيدة: وش صرت تفهم أكثر من أمس؟','A useful comparison: what do you understand better than yesterday?'],
  ['ابدأ بالمتاح، وعدّل خطتك وأنت تتعلم.','Start with what you have and adjust as you learn.'],
  ['يعطيك العافية على الوقت اللي أعطيته لهدفك.','Give yourself credit for the time you gave your goal.'],
];
export const motivation={ar:[],en:[]};
for(const [source,slug,pairs] of talks)for(const pair of pairs){
  for(const [i,lang] of ['ar','en'].entries())motivation[lang].push({id:`${slug}-${pairs.indexOf(pair)}`,text:pair[i],source,sourceUrl:'https://www.ted.com/talks/'+slug,kind:'inspired'});
}
for(const [index,pair] of originals.entries())for(const [i,lang] of ['ar','en'].entries())motivation[lang].push({id:'pm-'+index,text:pair[i],source:'PomoMental Team',sourceUrl:null,kind:'original'});
// Shuffle bags prevent repetition until the whole collection has appeared.
export function createMotivationPicker(random=Math.random){
  let bag=[],last=-1;
  return lang=>{
    if(!bag.length){bag=motivation.en.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
    last=bag.pop();return motivation[lang==='ar'?'ar':'en'][last];
  };
}
