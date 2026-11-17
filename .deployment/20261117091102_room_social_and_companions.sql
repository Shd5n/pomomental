begin;
-- Extend the existing authenticated API; preserve its owner and rate-limit checks.
do $patch$
declare body text;
begin
  body:=pg_get_functiondef('pm_private.room_view(text,uuid,bigint)'::regprocedure);
  if position('if phase->>''phase''=''break'' then' in body)=0 then raise exception 'Unexpected room_view definition';end if;
  body:=replace(body,'if phase->>''phase''=''break'' then','if phase->>''phase'' in (''waiting'',''break'') then');
  body:=replace(body,'phase:=pm_private.room_phase(r,n);','phase:=pm_private.room_phase(r,n); if phase->>''phase''=''complete'' then delete from pm_private.room_messages where room_code=p_code; end if;');
  execute body;
  body:=pg_get_functiondef('public.pomomental_api(text,text,jsonb,jsonb)'::regprocedure);
  if position('if result->>''phase''<>''break'' then' in body)=0 then raise exception 'Unexpected chat authorization definition';end if;
  body:=replace(body,'if result->>''phase''<>''break'' then','if result->>''phase'' not in (''waiting'',''break'') then');
  body:=replace(body,'Chat opens during breaks only.','Chat opens while waiting and during breaks.');
  execute body;
end;$patch$;

create or replace function pm_private.avatar(v jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare a jsonb;k text;s text;
begin
  a:=jsonb_build_object('type',case when v->>'type' in('saudi','boy','girl','engineer','doctor') then v->>'type' else 'saudi' end,'color',case when v->>'color'~'^#[0-9a-fA-F]{6}$' then v->>'color' else '#008540' end,'badge',left(coalesce(v->>'badge','PM'),20));
  if v->>'universityId' ~ '^[A-Za-z0-9_-]{1,100}$' then a:=a||jsonb_build_object('universityId',v->>'universityId');end if;
  foreach k in array array['image','logo'] loop
    s:=v->>k;if s is not null and length(s)<350000 and s~'^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$' then a:=a||jsonb_build_object(k,s);end if;
  end loop;
  return a;
end;$$;

create or replace function pm_private.expire_room_chat() returns integer language plpgsql set search_path='' as $$
declare removed integer;
begin
  delete from pm_private.room_messages m using pm_private.study_rooms r
    where m.room_code=r.code and (r.closed_at is not null or r.ends_at<=pm_private.now_ms());
  get diagnostics removed=row_count;
  return removed;
end;$$;

create or replace function pm_private.clear_closed_room_chat() returns trigger language plpgsql set search_path='' as $$
begin
  if new.closed_at is not null then delete from pm_private.room_messages where room_code=new.code;end if;
  return new;
end;$$;
create trigger clear_closed_room_chat after update of closed_at on pm_private.study_rooms
  for each row execute function pm_private.clear_closed_room_chat();
revoke all on function pm_private.avatar(jsonb),pm_private.expire_room_chat(),pm_private.clear_closed_room_chat() from public,anon,authenticated;
-- Retired character types render as the new formal Saudi companion.
update pm_private.profiles set avatar=pm_private.avatar(avatar) where avatar->>'type' in('anime','cat','robot');
commit;
