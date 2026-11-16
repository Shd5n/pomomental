import { config } from './config.js';
import { createClient } from './vendor/supabase.js';
export { config };
function isPublicKey(key){if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}}
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl) && isPublicKey(config.supabasePublishableKey);
export const supabase = configured?createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function request(path,body){
  if(config.backend==='sites'){
    const r=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin'});
    const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error),{code:data.code,status:r.status});return data;
  }
  if(!supabase)throw Object.assign(new Error('Connect your Supabase project before signing in.'),{code:'SETUP_REQUIRED',status:503});
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw Object.assign(new Error('Please sign in.'),{code:'SIGN_IN_REQUIRED',status:401});
  const u=new URL(path,'https://pm.invalid');
  const {data,error}=await supabase.rpc('pomomental_api',{p_path:u.pathname,p_method:body===undefined?'GET':'POST',p_body:body??{},p_query:Object.fromEntries(u.searchParams)});
  if(error)throw Object.assign(new Error(error.message),{code:error.code,status:500});
  if(data?.error)throw Object.assign(new Error(data.error),{code:data.code,status:data.status||400});
  return data;
}
export async function signOut(){if(supabase){const {error}=await supabase.auth.signOut();if(error)throw error;}else location.href='./focus.html?view=auth';}
export function renderAuth(container,{lang='ar',t,esc,onSuccess=()=>{},toast=()=>{}}){
  let mode=new URL(location.href).searchParams.get('auth')==='recovery'?'recovery':'login',destroyed=false;
  const text=t||((a,b)=>lang==='ar'?a:b);
  const safe=esc||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  let subscription;
  const redirectTo=new URL('focus.html?auth=callback',import.meta.url).href;
  function render(){
    if(destroyed)return;
    container.innerHTML=`<div class="auth-layout"><section class="auth-welcome"><img src="./icon-192.png" alt="" width="64" height="64"><h1>${text('أهلًا بك في PomoMental','Welcome to PomoMental')}</h1><p>${text('حساب واحد يجمع جلساتك، رفيقك، وتقدمك على كل أجهزتك.','One account for your sessions, your companion, and your progress on every device.')}</p><div class="auth-illustration" aria-hidden="true">◔<span>25:00</span></div><p class="muted">${text('ابدأ بموضوع واحد. وسجّل وقتك أول بأول.','Start with one topic. Keep track as you go.')}</p></section><section class="panel panel-pad auth-form-card"><h2>${mode==='signup'?text('حساب جديد','Create an account'):mode==='reset'?text('نسيت كلمة المرور؟','Forgot your password?'):mode==='recovery'?text('كلمة مرور جديدة','Choose a new password'):text('تسجيل الدخول','Sign in')}</h2><p class="muted" style="margin:8px 0 25px">${mode==='signup'?text('حياك! نحتاج بريدك وكلمة مرور قوية.','Glad you’re here. Use your email and a strong password.'):mode==='reset'?text('بنرسل لك رابط استعادة على بريدك.','We’ll send a reset link to your email.'):text('خلّنا نكمل من مكان ما وقفنا.','Let’s pick up where you left off.')}</p>
    ${!configured?`<div class="note" style="margin-bottom:20px">${text('تسجيل الدخول لم يُفعّل لهذه النسخة بعد. تقدر تبدأ جلسة على جهازك الآن.','Sign-in hasn’t been activated for this version yet. You can start a session on this device.')}</div>`:''}
    <form data-auth-form>${mode!=='recovery'?`<label class="field"><span>${text('البريد الإلكتروني','Email address')}</span><input type="email" name="email" required autocomplete="email" placeholder="you@example.com" dir="ltr"></label>`:''}${!['reset'].includes(mode)?`<label class="field"><span>${text('كلمة المرور','Password')}</span><div class="password-field"><input type="password" name="password" required minlength="${mode==='login'?1:12}" maxlength="128" autocomplete="${mode==='login'?'current-password':'new-password'}"><button type="button" data-reveal aria-label="${text('إظهار كلمة المرور','Show password')}">◉</button></div>${mode!=='login'?`<small>${text('١٢ حرفًا أو أكثر. استخدم عبارة يسهل عليك تذكرها.','12 characters or more. A memorable passphrase works well.')}</small>`:''}</label>`:''}<p class="auth-error" data-error role="alert" hidden></p><button type="submit" class="primary" style="width:100%" ${configured?'':'disabled'}>${mode==='signup'?text('إنشاء حساب','Create account'):mode==='reset'?text('أرسل رابط الاستعادة','Send reset link'):mode==='recovery'?text('احفظ كلمة المرور','Save password'):text('دخول','Sign in')}</button></form>
    ${['login','signup'].includes(mode)?`<div class="auth-divider"><span>${text('أو','or')}</span></div><div class="auth-providers"><button data-provider="google" ${configured&&config.providers.google?'':'disabled'}><b class="google-letter">G</b> ${text('المتابعة مع Google','Continue with Google')}${!config.providers.google?`<small>${text('بانتظار الربط','Awaiting setup')}</small>`:''}</button></div>`:''}
    <div class="auth-links">${mode==='login'?`<button class="quiet-button" data-mode="reset">${text('نسيت كلمة المرور؟','Forgot password?')}</button><span>${text('أول مرة هنا؟','New here?')} <button class="quiet-button" data-mode="signup">${text('إنشاء حساب','Create account')}</button></span>`:`<button class="quiet-button" data-mode="login">${text('عندي حساب — تسجيل الدخول','Already have an account? Sign in')}</button>`}</div></section></div>`;
    container.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render();});
    const reveal=container.querySelector('[data-reveal]');if(reveal)reveal.onclick=()=>{const input=container.querySelector('[name=password]');input.type=input.type==='password'?'text':'password';reveal.setAttribute('aria-label',input.type==='password'?text('إظهار كلمة المرور','Show password'):text('إخفاء كلمة المرور','Hide password'));};
    const showError=error=>{const box=container.querySelector('[data-error]');if(box){box.hidden=false;box.textContent=localError(error.message);}};
    container.querySelectorAll('[data-provider]').forEach(b=>b.onclick=async()=>{b.disabled=true;const {error}=await supabase.auth.signInWithOAuth({provider:b.dataset.provider,options:{redirectTo}});if(error){showError(error);b.disabled=false;}});
    container.querySelector('[data-auth-form]').onsubmit=async event=>{event.preventDefault();if(!supabase)return;const form=event.currentTarget,button=form.querySelector('[type=submit]'),data=new FormData(form);button.disabled=true;try{let result;const email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');if(mode==='signup')result=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});else if(mode==='reset')result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:new URL('focus.html?auth=recovery',import.meta.url).href});else if(mode==='recovery')result=await supabase.auth.updateUser({password});else result=await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(mode==='reset'){toast(text('إذا كان البريد مسجلًا، سيصلك رابط الاستعادة.','If the address is registered, a reset link will arrive.'));}else if(mode==='signup'&&!result.data.session){toast(text('افتح بريدك وأكد حسابك، ثم ارجع وسجّل الدخول.','Check your email to confirm your account, then sign in.'));mode='login';render();}else{toast(text('حياك! تم تسجيل الدخول.','You’re signed in. Welcome!'));await onSuccess();}}catch(error){if(!destroyed)showError(error);}finally{if(button.isConnected)button.disabled=false;}};
  }
  function localError(message){if(lang!=='ar')return message;if(/invalid login/i.test(message))return 'البريد أو كلمة المرور غير صحيحة.';if(/email not confirmed/i.test(message))return 'أكد بريدك الإلكتروني أولًا.';if(/rate limit|too many/i.test(message))return 'محاولات كثيرة خلال وقت قصير. انتظر قليلًا وحاول مجددًا.';if(/password/i.test(message))return 'اختر كلمة مرور أطول وأكثر قوة.';if(/fetch|network/i.test(message))return 'تعذر الاتصال. تأكد من اتصالك وحاول مرة ثانية.';return message;}
  if(supabase)subscription=supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){mode='recovery';render();}}).data.subscription;
  render();return{destroy(){destroyed=true;subscription?.unsubscribe();}};
}
