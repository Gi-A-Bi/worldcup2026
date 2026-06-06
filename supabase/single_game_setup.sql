-- =============================================================
-- 단일 게임 + 닉네임/비밀번호 로그인 셋업
-- =============================================================
-- 방 코드 없이 "닉네임 + 비밀번호"로 접속하는 하나의 공유 게임 구성.
-- Supabase SQL Editor 에서 한 번 실행하세요. (여러 번 실행해도 안전 — 멱등)
-- =============================================================

-- 비밀번호 해시용
create extension if not exists pgcrypto;

-- players 에 비밀번호 해시 컬럼 추가
alter table players add column if not exists password_hash text;

-- 단일 게임 방(code='MAIN') 생성 (이미 있으면 그대로)
insert into rooms (code, name, tournament_name)
values ('MAIN', '우리들의 월드컵', '2026 월드컵')
on conflict (code) do nothing;

-- 48팀 시드 (MAIN 방에 팀이 하나도 없을 때만)
insert into teams (room_id, name, group_label, flag_emoji, fifa_code)
select (select id from rooms where code = 'MAIN'), v.name, v.grp, v.flag, v.code
from (values
  ('멕시코','A','🇲🇽','MEX'), ('남아공','A','🇿🇦','RSA'), ('대한민국','A','🇰🇷','KOR'), ('체코','A','🇨🇿','CZE'),
  ('캐나다','B','🇨🇦','CAN'), ('보스니아','B','🇧🇦','BIH'), ('카타르','B','🇶🇦','QAT'), ('스위스','B','🇨🇭','SUI'),
  ('브라질','C','🇧🇷','BRA'), ('모로코','C','🇲🇦','MAR'), ('아이티','C','🇭🇹','HAI'), ('스코틀랜드','C','🏴󠁧󠁢󠁳󠁣󠁴󠁿','SCO'),
  ('미국','D','🇺🇸','USA'), ('파라과이','D','🇵🇾','PAR'), ('호주','D','🇦🇺','AUS'), ('튀르키예','D','🇹🇷','TUR'),
  ('독일','E','🇩🇪','GER'), ('쿠라소','E','🇨🇼','CUW'), ('코트디부아르','E','🇨🇮','CIV'), ('에콰도르','E','🇪🇨','ECU'),
  ('네덜란드','F','🇳🇱','NED'), ('일본','F','🇯🇵','JPN'), ('스웨덴','F','🇸🇪','SWE'), ('튀니지','F','🇹🇳','TUN'),
  ('벨기에','G','🇧🇪','BEL'), ('이집트','G','🇪🇬','EGY'), ('이란','G','🇮🇷','IRN'), ('뉴질랜드','G','🇳🇿','NZL'),
  ('스페인','H','🇪🇸','ESP'), ('카보베르데','H','🇨🇻','CPV'), ('사우디아라비아','H','🇸🇦','KSA'), ('우루과이','H','🇺🇾','URU'),
  ('프랑스','I','🇫🇷','FRA'), ('세네갈','I','🇸🇳','SEN'), ('이라크','I','🇮🇶','IRQ'), ('노르웨이','I','🇳🇴','NOR'),
  ('아르헨티나','J','🇦🇷','ARG'), ('알제리','J','🇩🇿','ALG'), ('오스트리아','J','🇦🇹','AUT'), ('요르단','J','🇯🇴','JOR'),
  ('포르투갈','K','🇵🇹','POR'), ('DR콩고','K','🇨🇩','COD'), ('우즈베키스탄','K','🇺🇿','UZB'), ('콜롬비아','K','🇨🇴','COL'),
  ('잉글랜드','L','🏴󠁧󠁢󠁥󠁮󠁧󠁿','ENG'), ('크로아티아','L','🇭🇷','CRO'), ('가나','L','🇬🇭','GHA'), ('파나마','L','🇵🇦','PAN')
) as v(name, grp, flag, code)
where not exists (
  select 1 from teams where room_id = (select id from rooms where code = 'MAIN')
);

-- =============================================================
-- 로그인 RPC: login_player (닉네임 + 비밀번호)
-- =============================================================
-- - 처음 보는 닉네임 → 그 비밀번호로 계정 자동 생성(칩 지급)
-- - 기존 닉네임 → 비밀번호 일치하면 복귀, 아니면 WRONG_PASSWORD
-- - 비밀번호는 bcrypt 해시로 저장, 응답엔 해시 미포함
-- =============================================================
create or replace function login_player(p_nickname text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_player  players;
  v_nick    text := btrim(p_nickname);
begin
  if v_nick = '' then raise exception 'NICKNAME_REQUIRED'; end if;
  if coalesce(p_password, '') = '' then raise exception 'PASSWORD_REQUIRED'; end if;

  select id into v_room_id from rooms where code = 'MAIN' limit 1;
  if v_room_id is null then raise exception 'NO_GAME'; end if;

  select * into v_player from players where room_id = v_room_id and nickname = v_nick;

  if v_player.id is null then
    -- 신규 가입
    insert into players (room_id, nickname, chips, password_hash)
    values (
      v_room_id, v_nick,
      (select initial_chips from rooms where id = v_room_id),
      crypt(p_password, gen_salt('bf'))
    )
    returning * into v_player;
    insert into activity_log (room_id, player_id, action, meta)
    values (v_room_id, v_player.id, 'login_create', jsonb_build_object('nickname', v_nick));
  elsif v_player.password_hash is null then
    -- 비번 없던 기존 계정 → 이번 비번으로 설정
    update players set password_hash = crypt(p_password, gen_salt('bf'))
     where id = v_player.id returning * into v_player;
  elsif v_player.password_hash <> crypt(p_password, v_player.password_hash) then
    raise exception 'WRONG_PASSWORD';
  end if;

  return json_build_object(
    'id', v_player.id,
    'room_id', v_player.room_id,
    'nickname', v_player.nickname,
    'chips', v_player.chips,
    'created_at', v_player.created_at
  );
end;
$$;

grant execute on function login_player(text, text) to anon, authenticated;
