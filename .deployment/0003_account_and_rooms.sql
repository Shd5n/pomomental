-- PomoMental: verified owner, onboarding, university rankings, waiting rooms.
-- Safe to apply to either the base schema or the earlier scheduled-room release.
begin;
alter table pm_private.study_rooms add column if not exists planned_cycles integer not null default 4 check(planned_cycles between 1 and 12);
alter table pm_private.study_rooms add column if not exists ends_at bigint;
alter table pm_private.profiles add column if not exists university_relation text not null default 'aspiring' check(university_relation in('student','aspiring'));
alter table pm_private.profiles add column if not exists onboarding_completed boolean not null default false;
update pm_private.profiles set onboarding_completed=true where display_name<>'Student' and length(btrim(display_name))>=2;
do $owner$
declare verified_owner uuid; match_count integer;
begin
  select count(*) into match_count from auth.users where lower(email)='dr.adeeb47@outlook.com' and email_confirmed_at is not null;
  if match_count>1 then raise exception 'Expected exactly one verified owner account.';end if;
  if match_count=1 then
    select id into verified_owner from auth.users where lower(email)='dr.adeeb47@outlook.com' and email_confirmed_at is not null;
    update pm_private.app_settings set owner_id=verified_owner,updated_at=pm_private.now_ms() where singleton and owner_id is distinct from verified_owner;
  end if;
end;$owner$;
create or replace function pm_private.now_ms() returns bigint language sql volatile set search_path='' as $$select floor(extract(epoch from clock_timestamp())*1000)::bigint$$;
create or replace function pm_private.minutes(v jsonb,fallback integer,maximum integer default 240) returns integer language plpgsql immutable set search_path='' as $$
declare n numeric;begin n:=coalesce((v#>>'{}')::numeric,fallback);if n<>trunc(n) or n<1 or n>maximum then raise exception 'INVALID_DURATION';end if;return n::integer;end;$$;
create or replace function pm_private.clean(v text,maximum integer) returns text language plpgsql immutable set search_path='' as $$begin v:=btrim(regexp_replace(coalesce(v,''),'[[:cntrl:]]','','g'));if length(v)<1 or length(v)>maximum then raise exception 'INVALID_INPUT';end if;return v;end;$$;
create or replace function pm_private.avatar(v jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare a jsonb;k text;s text;begin
a:=jsonb_build_object('type',case when v->>'type' in('saudi','anime','cat','robot') then v->>'type' else 'saudi' end,'color',case when v->>'color'~'^#[0-9a-fA-F]{6}$' then v->>'color' else '#008540' end,'badge',left(coalesce(v->>'badge','PM'),20));
foreach k in array array['image','logo'] loop s:=v->>k;if s is not null and length(s)<350000 and s~'^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$' then a:=a||jsonb_build_object(k,s);end if;end loop;return a;end;$$;
create or replace function pm_private.profile_view(p pm_private.profiles) returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('displayName',p.display_name,'country',p.country,'avatar',p.avatar,'university',p.university,'leaderboardOptIn',p.leaderboard_opt_in,'universityRelation',p.university_relation,'onboardingCompleted',p.onboarding_completed)$$;
create or replace function pm_private.elapsed(s pm_private.study_sessions,n bigint) returns integer language sql immutable set search_path='' as $$select case when s.kind='room' then s.elapsed_seconds else least(s.target_seconds,s.elapsed_seconds+case when s.status='running' then greatest(0,floor((least(n,s.deadline_ms)-s.running_since_ms)/1000.0)::integer) else 0 end) end$$;
create or replace function pm_private.session_view(s pm_private.study_sessions,n bigint) returns jsonb language sql immutable set search_path='' as $$select to_jsonb(s)||jsonb_build_object('elapsedSeconds',pm_private.elapsed(s,n),'targetSeconds',s.target_seconds,'remainingSeconds',greatest(0,s.target_seconds-pm_private.elapsed(s,n)),'startedAt',s.started_at,'finishedAt',s.finished_at,'breakMinutes',s.break_minutes,'longBreakMinutes',s.long_break_minutes,'cycles',s.cycles)$$;
create or replace function pm_private.settle(p_id uuid,p_uid uuid,p_action text,n bigint) returns pm_private.study_sessions language plpgsql set search_path='' as $$
declare s pm_private.study_sessions;e integer;d integer;new_status text;new_deadline bigint;new_since bigint;stamp bigint;begin
select * into s from pm_private.study_sessions where id=p_id and user_id=p_uid for update;
if not found then raise exception 'SESSION_NOT_FOUND';end if;if s.kind<>'solo' then raise exception 'USE_ROOM_CONTROLS';end if;if s.status in('completed','finished') then return s;end if;
e:=pm_private.elapsed(s,n);d:=greatest(0,e-s.elapsed_seconds);new_status:=s.status;new_deadline:=s.deadline_ms;
if e>=s.target_seconds then new_status:='completed';elsif p_action='finish' then new_status:='finished';elsif p_action='pause' then new_status:='paused';elsif p_action='resume' and s.status='paused' then new_status:='running';new_deadline:=n+(s.target_seconds-e)*1000;end if;
stamp:=case when new_status='completed' then s.deadline_ms else n end;
new_since:=case when p_action='heartbeat' and new_status='running' then s.running_since_ms+d*1000 else n end;
if d>0 then insert into pm_private.study_credits(user_id,session_id,subject,seconds,credited_at) values(p_uid,s.id,s.subject,d,stamp);end if;
update pm_private.study_sessions set elapsed_seconds=e,status=new_status,deadline_ms=new_deadline,running_since_ms=new_since,finished_at=case when new_status in('completed','finished') then stamp else null end where id=s.id returning * into s;return s;end;$$;
create or replace function pm_private.room_phase(r pm_private.study_rooms,n bigint) returns jsonb language plpgsql immutable set search_path='' as $$
declare f bigint:=r.focus_minutes*60000;b bigint:=r.break_minutes*60000;e bigint:=greatest(0,n-r.started_at);o bigint;begin if n<r.started_at then return jsonb_build_object('phase','waiting','remainingSeconds',ceil((r.started_at-n)/1000.0)::integer,'cycle',0);end if;if r.ends_at is not null and n>=r.ends_at then return jsonb_build_object('phase','complete','remainingSeconds',0,'cycle',r.planned_cycles);end if;o:=e%(f+b);return jsonb_build_object('phase',case when o<f then 'focus' else 'break' end,'remainingSeconds',ceil((case when o<f then f else f+b end-o)/1000.0)::integer,'cycle',floor(e/(f+b)::numeric)::integer+1);end;$$;
create or replace function pm_private.room_focus_total(r pm_private.study_rooms,n bigint) returns bigint language plpgsql immutable set search_path='' as $$
declare f bigint:=r.focus_minutes*60;c bigint:=(r.focus_minutes+r.break_minutes)*60;e bigint:=greatest(0,floor((least(n,coalesce(r.ends_at,n))-r.started_at)/1000.0)::bigint);begin return (e/c)*f+least(e%c,f);end;$$;
create or replace function pm_private.room_heartbeat(p_code text,p_uid uuid,n bigint,p_leave boolean default false) returns integer language plpgsql set search_path='' as $$
declare r pm_private.study_rooms;m pm_private.room_members;d integer;s pm_private.study_sessions;begin
select * into r from pm_private.study_rooms where code=p_code;if not found or r.closed_at is not null then raise exception 'ROOM_NOT_FOUND';end if;
select * into m from pm_private.room_members where room_code=p_code and user_id=p_uid and left_at is null for update;if not found then if r.ends_at is not null and n>=r.ends_at and exists(select 1 from pm_private.room_members where room_code=p_code and user_id=p_uid) then return 0;end if;raise exception 'ROOM_MEMBERSHIP_REQUIRED';end if;
p_leave:=p_leave or (r.ends_at is not null and n>=r.ends_at);
d:=greatest(0,pm_private.room_focus_total(r,n)-pm_private.room_focus_total(r,greatest(m.last_seen,m.joined_at,n-90000)))::integer;
select * into s from pm_private.study_sessions where id=m.session_id for update;
if d>0 then insert into pm_private.study_credits(user_id,session_id,subject,seconds,credited_at) values(p_uid,s.id,r.subject,d,n);end if;
update pm_private.study_sessions set elapsed_seconds=elapsed_seconds+d,running_since_ms=n,status=case when p_leave then 'finished' else 'room' end,finished_at=case when p_leave then n else null end where id=m.session_id;
update pm_private.room_members set last_seen=n,left_at=case when p_leave then n else null end where id=m.id;return d;end;$$;
create or replace function pm_private.room_view(p_code text,p_uid uuid,n bigint) returns jsonb language plpgsql set search_path='' as $$
declare r pm_private.study_rooms;m pm_private.room_members;phase jsonb;people jsonb;messages jsonb:='[]';begin
select * into r from pm_private.study_rooms where code=p_code;if not found or r.closed_at is not null then raise exception 'ROOM_NOT_FOUND';end if;
select * into m from pm_private.room_members where room_code=p_code and user_id=p_uid and (left_at is null or (r.ends_at is not null and n>=r.ends_at)) order by joined_at desc limit 1;if not found then raise exception 'ROOM_MEMBERSHIP_REQUIRED';end if;
phase:=pm_private.room_phase(r,n);
select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'country',p.country,'avatar',p.avatar,'joined_at',rm.joined_at,'last_seen',rm.last_seen,'elapsed_seconds',s.elapsed_seconds,'isYou',p.user_id=p_uid,'online',n-rm.last_seen<90000) order by rm.joined_at),'[]') into people from pm_private.room_members rm join pm_private.profiles p on p.user_id=rm.user_id join pm_private.study_sessions s on s.id=rm.session_id where rm.room_code=p_code and rm.left_at is null;
if phase->>'phase'='break' then select coalesce(jsonb_agg(z.msg order by z.stamp),'[]') into messages from(select rm.created_at stamp,jsonb_build_object('id',rm.id,'user_id',rm.user_id,'text',rm.text,'created_at',rm.created_at,'display_name',p.display_name,'avatar',p.avatar,'isYou',p.user_id=p_uid) msg from pm_private.room_messages rm join pm_private.profiles p on p.user_id=rm.user_id where rm.room_code=p_code and rm.deleted_at is null order by rm.created_at desc limit 100)z;end if;
return jsonb_build_object('room',to_jsonb(r)||jsonb_build_object('isOwner',r.owner_id=p_uid),'code',r.code,'memberId',m.id,'members',people,'messages',messages,'serverTime',n)||phase;end;$$;
create or replace function pm_private.join_room(p_code text,p_uid uuid,n bigint) returns void language plpgsql set search_path='' as $$
declare r pm_private.study_rooms;sid uuid;begin
-- Serialize joins with owner closure and other joins. In particular, do not let
-- an in-flight join create a live session after the owner closes this room.
select * into r from pm_private.study_rooms where code=p_code for update;if not found or r.closed_at is not null or (r.ends_at is not null and n>=r.ends_at) then raise exception 'ROOM_NOT_FOUND';end if;
perform 1 from pm_private.profiles where user_id=p_uid for update;
if exists(select 1 from pm_private.room_members where room_code=p_code and user_id=p_uid and left_at is null) then return;end if;
if exists(select 1 from pm_private.study_sessions where user_id=p_uid and status in('running','paused','room')) then raise exception 'ACTIVE_SESSION';end if;
if (select count(*) from pm_private.room_members where room_code=p_code and left_at is null)>=30 then raise exception 'ROOM_FULL';end if;
insert into pm_private.study_sessions(user_id,subject,kind,room_code,status,running_since_ms,deadline_ms,started_at,break_minutes) values(p_uid,r.subject,'room',p_code,'room',n,0,n,r.break_minutes) returning id into sid;
insert into pm_private.room_members(room_code,user_id,session_id,joined_at,last_seen) values(p_code,p_uid,sid,n,n);end;$$;

create or replace function public.pomomental_api(p_path text,p_method text default 'GET',p_body jsonb default '{}',p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();n bigint:=pm_private.now_ms();parts text[];verb text:=upper(p_method);p pm_private.profiles;s pm_private.study_sessions;r pm_private.study_rooms;m pm_private.room_members;owner uuid;subject_name text;code text;action text;f integer;b integer;lb integer;cycles integer;d integer;result jsonb;rows jsonb;active jsonb;totals jsonb;events jsonb;rooms jsonb;offset_ms bigint;period_start bigint;period_name text;tab text;page_limit integer;page_offset integer;before_value jsonb;after_value jsonb;target_id uuid;closed boolean;suspended boolean;country text;err text;limit_scope text;request_count integer;scheduled_start bigint;scheduled_end bigint;
begin
if uid is null then return jsonb_build_object('error','Please sign in.','code','SIGN_IN_REQUIRED','status',401);end if;
parts:=string_to_array(trim(both '/' from p_path),'/');
limit_scope:=case when parts[1]='rooms' and parts[2]='join' then 'room-join' else 'general' end;
delete from pm_private.request_limits where user_id=uid and bucket<n/60000-2;
insert into pm_private.request_limits(user_id,scope,bucket,requests) values(uid,limit_scope,n/60000,1) on conflict(user_id,scope,bucket) do update set requests=pm_private.request_limits.requests+1 returning requests into request_count;
if request_count>(case when limit_scope='room-join' then 10 else 120 end) then return jsonb_build_object('error','Too many requests. Please wait a minute.','code','RATE_LIMITED','status',429);end if;
-- The dispatch has its own exception subtransaction. A denied room-code guess
-- must roll back route changes without rolling back the attempt counter above.
begin
if p_path is null or p_body is null or p_query is null or length(p_path)>250 or octet_length(p_body::text)>750000 or jsonb_typeof(p_body)<>'object' or jsonb_typeof(p_query)<>'object' then raise exception 'INVALID_INPUT';end if;
if verb is null or verb not in('GET','POST') then raise exception 'METHOD_NOT_ALLOWED';end if;
select settings.owner_id into owner from pm_private.app_settings settings join auth.users owner_user on owner_user.id=settings.owner_id where settings.singleton and lower(owner_user.email)='dr.adeeb47@outlook.com' and owner_user.email_confirmed_at is not null;
insert into pm_private.profiles(user_id,display_name,updated_at) values(uid,'Student',n) on conflict(user_id) do nothing;
select * into p from pm_private.profiles where user_id=uid;
if p.suspended and uid is distinct from owner then return jsonb_build_object('error','This account is suspended. Contact the app owner.','code','ACCOUNT_SUSPENDED','status',403);end if;

-- Owner controls are checked on the database, never on a hidden UI button.
if parts[1]='admin' then
  if parts[2]='status' and verb='GET' then return jsonb_build_object('configured',owner is not null,'isAdmin',coalesce(uid=owner,false));end if;
  if owner is null then return jsonb_build_object('error','The project owner must set owner_id in the SQL dashboard.','code','OWNER_NOT_CONFIGURED','status',503);end if;
  if uid<>owner then return jsonb_build_object('error','Owner access only.','code','FORBIDDEN','status',403);end if;
  if parts[2]='summary' and verb='GET' then return jsonb_build_object('profiles',(select count(*) from pm_private.profiles),'sessions',(select count(*) from pm_private.study_sessions),'seconds',(select coalesce(sum(seconds),0) from pm_private.study_credits),'rooms',(select count(*) from pm_private.study_rooms),'activeRooms',(select count(*) from pm_private.study_rooms where closed_at is null),'messages',(select count(*) from pm_private.room_messages where deleted_at is null),'events',(select count(*) from pm_private.admin_events),'serverTime',n);end if;
  if parts[2] in('tables','export') and verb='GET' then
    tab:=case when parts[2]='tables' then parts[3] else p_query->>'table' end;
    if tab not in('profiles','study_sessions','study_rooms','room_members','room_messages','study_credits','admin_events') then raise exception 'INVALID_TABLE';end if;
    page_limit:=least(500,greatest(1,coalesce((p_query->>'limit')::integer,50)));page_offset:=greatest(0,coalesce((p_query->>'cursor')::integer,0));
    execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from(select * from pm_private.%I order by %I limit $1 offset $2)x',tab,case when tab='profiles' then 'user_id' when tab='study_rooms' then 'code' else 'id' end) into rows using page_limit,page_offset;
    return jsonb_build_object('table',tab,'rows',rows,'nextCursor',case when jsonb_array_length(rows)=page_limit then (page_offset+page_limit)::text else null end,'exportedAt',n);
  end if;
  if parts[2]='profiles' and parts[3] is not null and verb='POST' then
    target_id:=parts[3]::uuid;select to_jsonb(x) into before_value from pm_private.profiles x where user_id=target_id for update;if before_value is null then raise exception 'PROFILE_NOT_FOUND';end if;
    if coalesce((p_body->>'suspended')::boolean,false) and target_id=owner then raise exception 'CANNOT_SUSPEND_OWNER';end if;
    country:=coalesce(p_body->>'country',before_value->>'country');if country!~'^[A-Z]{2}$' or country='IL' then raise exception 'INVALID_COUNTRY';end if;
    update pm_private.profiles set display_name=pm_private.clean(coalesce(p_body->>'displayName',display_name),40),country=country,leaderboard_opt_in=coalesce((p_body->>'leaderboardOptIn')::boolean,leaderboard_opt_in),suspended=coalesce((p_body->>'suspended')::boolean,pm_private.profiles.suspended),updated_at=n where user_id=target_id;
    select to_jsonb(x) into after_value from pm_private.profiles x where user_id=target_id;
  elsif parts[2]='rooms' and parts[3] is not null and verb='POST' then
    code:=upper(parts[3]);select to_jsonb(x) into before_value from pm_private.study_rooms x where x.code=code for update;if before_value is null then raise exception 'ROOM_NOT_FOUND';end if;closed:=coalesce((p_body->>'closed')::boolean,true);
    if closed and before_value->>'closed_at' is null then for m in select * from pm_private.room_members where room_code=code and left_at is null loop perform pm_private.room_heartbeat(code,m.user_id,n,true);end loop;end if;
    update pm_private.study_rooms set closed_at=case when closed then n else null end where pm_private.study_rooms.code=code;select to_jsonb(x) into after_value from pm_private.study_rooms x where x.code=code;
  elsif parts[2]='messages' and parts[3] is not null and verb='POST' then
    target_id:=parts[3]::uuid;select to_jsonb(x) into before_value from pm_private.room_messages x where id=target_id for update;if before_value is null then raise exception 'MESSAGE_NOT_FOUND';end if;
    update pm_private.room_messages set deleted_at=case when coalesce((p_body->>'deleted')::boolean,true) then n else null end where id=target_id;select to_jsonb(x) into after_value from pm_private.room_messages x where id=target_id;
  else raise exception 'NOT_FOUND';end if;
  insert into pm_private.admin_events(actor_id,action,target,before_value,after_value,created_at) values(uid,parts[2],parts[3],before_value,after_value,n);
  return jsonb_build_object('saved',true,'record',after_value,'serverTime',n);
end if;

-- Settle expired group memberships before starting another session.
for m in select rm.* from pm_private.room_members rm join pm_private.study_rooms sr on sr.code=rm.room_code where rm.user_id=uid and rm.left_at is null and sr.ends_at<=n and sr.closed_at is null loop perform pm_private.room_heartbeat(m.room_code,uid,n,true);end loop;
-- Finalize an expired focus block before any new block can be started.
for s in select * from pm_private.study_sessions where user_id=uid and status='running' and deadline_ms<=n loop perform pm_private.settle(s.id,uid,'finish',n);end loop;
if parts[1]='state' and verb='GET' then
  select coalesce(jsonb_agg(pm_private.session_view(x,n) order by x.started_at desc),'[]') into rows from(select * from pm_private.study_sessions where user_id=uid order by started_at desc limit 2000)x;
  select pm_private.session_view(x,n) into active from pm_private.study_sessions x where user_id=uid and status in('running','paused','room') limit 1;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.seconds desc),'[]') into totals from(select subject,sum(elapsed_seconds) seconds,count(*) sessions from pm_private.study_sessions where user_id=uid group by subject)x;
  offset_ms:=greatest(-840,least(840,coalesce((p_query->>'tz')::integer,0)))*60000;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.at desc),'[]') into events from(select subject,sum(seconds) seconds,((credited_at+offset_ms)/86400000)*86400000-offset_ms as "at" from pm_private.study_credits where user_id=uid and seconds>0 and credited_at>=n-370::bigint*86400000 group by subject,((credited_at+offset_ms)/86400000))x;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rooms from(select sr.* from pm_private.study_rooms sr join pm_private.room_members rm on rm.room_code=sr.code where rm.user_id=uid and rm.left_at is null and sr.closed_at is null)x;
  return jsonb_build_object('user',jsonb_build_object('id',uid,'email',auth.jwt()->>'email','displayName',p.display_name,'isAdmin',coalesce(uid=owner,false)),'profile',pm_private.profile_view(p),'sessions',rows,'activeSession',active,'totals',jsonb_build_object('seconds',(select coalesce(sum(elapsed_seconds),0) from pm_private.study_sessions where user_id=uid),'bySubject',totals),'activities',events,'rooms',rooms,'serverTime',n,'authProvider','supabase','capabilities',jsonb_build_object('roomScheduling',true,'profileOnboarding',true,'universityRankings',true));
elsif parts[1]='profile' and verb='POST' then
  country:=coalesce(p_body->>'country',p.country);if country!~'^[A-Z]{2}$' or country='IL' then raise exception 'INVALID_COUNTRY';end if;
  update pm_private.profiles set display_name=pm_private.clean(coalesce(p_body->>'displayName',p.display_name),40),country=country,avatar=case when p_body?'avatar' then pm_private.avatar(p_body->'avatar') else p.avatar end,university=left(coalesce(p_body->>'university',p.university),200),university_relation=case when p_body->>'universityRelation' in('student','aspiring') then p_body->>'universityRelation' else p.university_relation end,onboarding_completed=case when p_body->>'onboardingCompleted'='true' and length(btrim(p_body->>'displayName')) between 2 and 40 then true else p.onboarding_completed end,leaderboard_opt_in=coalesce((p_body->>'leaderboardOptIn')::boolean,p.leaderboard_opt_in),updated_at=n where user_id=uid returning * into p;
  return jsonb_build_object('profile',pm_private.profile_view(p),'serverTime',n);
elsif parts[1]='sessions' and parts[2]='start' and verb='POST' then
  perform 1 from pm_private.profiles where user_id=uid for update;
  if exists(select 1 from pm_private.study_sessions where user_id=uid and status in('running','paused','room')) then raise exception 'ACTIVE_SESSION';end if;
  subject_name:=pm_private.clean(p_body->>'subject',100);f:=pm_private.minutes(p_body->'focusMinutes',25);b:=pm_private.minutes(p_body->'breakMinutes',5,60);lb:=pm_private.minutes(p_body->'longBreakMinutes',15,120);cycles:=pm_private.minutes(p_body->'cycles',4,12);
  insert into pm_private.study_sessions(user_id,subject,status,target_seconds,running_since_ms,deadline_ms,started_at,break_minutes,long_break_minutes,cycles) values(uid,subject_name,'running',f*60,n,n+f*60000,n,b,lb,cycles) returning * into s;
  return jsonb_build_object('session',pm_private.session_view(s,n),'serverTime',n);
elsif parts[1]='sessions' and parts[3] in('heartbeat','pause','resume','finish') and verb='POST' then
  s:=pm_private.settle(parts[2]::uuid,uid,parts[3],n);return jsonb_build_object('session',pm_private.session_view(s,n),'serverTime',n);
elsif parts[1]='leaderboard' and verb='GET' then
  period_name:=coalesce(p_query->>'period','week');period_start:=case when period_name='all' then 0 when period_name='month' then extract(epoch from date_trunc('month',to_timestamp(n/1000.0) at time zone 'UTC') at time zone 'UTC')*1000 else extract(epoch from date_trunc('week',to_timestamp(n/1000.0) at time zone 'UTC') at time zone 'UTC')*1000 end;
  select coalesce(jsonb_agg(x.entry order by x.seconds desc),'[]') into rows from(select sum(c.seconds) seconds,jsonb_build_object('displayName',pr.display_name,'country',pr.country,'university',pr.university,'universityRelation',pr.university_relation,'avatar',pr.avatar,'seconds',sum(c.seconds),'sessions',count(distinct c.session_id),'isYou',pr.user_id=uid) entry from pm_private.study_credits c join pm_private.profiles pr on pr.user_id=c.user_id where pr.leaderboard_opt_in and not pr.suspended and c.credited_at>=period_start group by pr.user_id order by sum(c.seconds) desc limit 100)x;
  return jsonb_build_object('period',period_name,'entries',rows,'serverTime',n);
elsif parts[1]='rooms' and array_length(parts,1)=1 and verb='POST' then
  if(select count(*) from pm_private.study_rooms where owner_id=uid and started_at>n-86400000)>=20 then raise exception 'ROOM_RATE_LIMIT';end if;
  subject_name:=pm_private.clean(p_body->>'subject',100);f:=pm_private.minutes(p_body->'focusMinutes',25);b:=pm_private.minutes(p_body->'breakMinutes',5,60);
  cycles:=pm_private.minutes(p_body->'cycles',4,12);scheduled_start:=case when p_body?'waitMinutes' then n+pm_private.minutes(p_body->'waitMinutes',5,60)::bigint*60000 else coalesce((p_body->>'startsAt')::bigint,n) end;if scheduled_start<n-60000 or scheduled_start>n+604800000 then raise exception 'INVALID_INPUT';end if;scheduled_start:=greatest(n,scheduled_start);scheduled_end:=scheduled_start+(cycles*f+(cycles-1)*b)::bigint*60000;
  code:=translate(upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),'01','GH');
  -- Hex invitation codes are generated with 32 bits of entropy; membership still
  -- requires an authenticated account and exposes no private user statistics.
  insert into pm_private.study_rooms(code,owner_id,subject,focus_minutes,break_minutes,started_at,planned_cycles,ends_at) values(code,uid,subject_name,f,b,scheduled_start,cycles,scheduled_end);
  perform pm_private.join_room(code,uid,n);return pm_private.room_view(code,uid,n);
elsif parts[1]='rooms' and parts[2]='join' and verb='POST' then
  code:=upper(btrim(p_body->>'code'));if code!~'^[A-Z0-9]{8}$' then raise exception 'INVALID_CODE';end if;perform pm_private.join_room(code,uid,n);return pm_private.room_view(code,uid,n);
elsif parts[1]='rooms' and parts[2] is not null then
  code:=upper(parts[2]);if code!~'^[A-Z0-9]{8}$' then raise exception 'INVALID_CODE';end if;
  if array_length(parts,1)=2 and verb='GET' then return pm_private.room_view(code,uid,n);end if;
  if parts[3]='heartbeat' and verb='POST' then d:=pm_private.room_heartbeat(code,uid,n);return pm_private.room_view(code,uid,n)||jsonb_build_object('creditedSeconds',d);end if;
  if parts[3]='leave' and verb='POST' then perform pm_private.room_heartbeat(code,uid,n,true);return jsonb_build_object('left',true,'serverTime',n);end if;
  if parts[3]='messages' and verb='POST' then
    result:=pm_private.room_view(code,uid,n);if result->>'phase'<>'break' then raise exception 'CHAT_LOCKED';end if;
    if exists(select 1 from pm_private.room_messages where user_id=uid and created_at>n-2000) then raise exception 'SLOW_DOWN';end if;
    insert into pm_private.room_messages(room_code,user_id,text,created_at) values(code,uid,pm_private.clean(p_body->>'text',500),n);return pm_private.room_view(code,uid,n);
  end if;
end if;
raise exception 'NOT_FOUND';
exception when unique_violation then return jsonb_build_object('error','Another active session already exists.','code','CONCURRENT_UPDATE','status',409);
when others then
err:=sqlerrm;
if err in('SESSION_NOT_FOUND','ROOM_NOT_FOUND','PROFILE_NOT_FOUND','MESSAGE_NOT_FOUND','NOT_FOUND') then return jsonb_build_object('error',replace(lower(err),'_',' '),'code',err,'status',404);end if;
if err in('ROOM_MEMBERSHIP_REQUIRED','CHAT_LOCKED','CANNOT_SUSPEND_OWNER') then return jsonb_build_object('error',case when err='CHAT_LOCKED' then 'Chat opens during breaks only.' else 'You do not have permission for this action.' end,'code',err,'status',403);end if;
if err in('ACTIVE_SESSION','USE_ROOM_CONTROLS','ROOM_FULL') then return jsonb_build_object('error','Finish your active session first, or check the room.','code',err,'status',409);end if;
if err in('SLOW_DOWN','ROOM_RATE_LIMIT') then return jsonb_build_object('error','Please wait before trying again.','code',err,'status',429);end if;
if err in('INVALID_INPUT','INVALID_DURATION','INVALID_COUNTRY','INVALID_CODE','INVALID_TABLE','METHOD_NOT_ALLOWED') or sqlstate in('22P02','22003') then return jsonb_build_object('error','Check the values and try again.','code','INVALID_INPUT','status',400);end if;
raise warning 'PomoMental internal database error: %',err;
return jsonb_build_object('error','The study service is temporarily unavailable.','code','SERVICE_ERROR','status',503);
end;
end;$$;
revoke all on all functions in schema pm_private from public,anon,authenticated;
revoke all on function public.pomomental_api(text,text,jsonb,jsonb) from public,anon;
grant execute on function public.pomomental_api(text,text,jsonb,jsonb) to authenticated;
commit;
