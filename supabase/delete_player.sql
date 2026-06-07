-- =============================================================
-- 참가자 삭제 RPC: delete_player (비밀번호 확인)
-- =============================================================
-- 해당 참가자의 비밀번호가 맞아야 삭제 가능.
-- 삭제 시 그 사람의 베팅/정산/확정/로그가 함께 사라짐.
-- Supabase SQL Editor 에서 한 번 실행.
-- =============================================================

create or replace function delete_player(p_nickname text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_player players;
begin
  select * into v_player
    from players
   where room_id = (select id from rooms where code = 'MAIN')
     and nickname = btrim(p_nickname);
  if v_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;

  if v_player.password_hash is null
     or v_player.password_hash <> crypt(p_password, v_player.password_hash) then
    raise exception 'WRONG_PASSWORD';
  end if;

  -- activity_log 는 cascade 없음 → 먼저 삭제. bets/settlements/bet_locks 는 cascade
  delete from activity_log where player_id = v_player.id;
  delete from players where id = v_player.id;
end;
$$;

grant execute on function delete_player(text, text) to anon, authenticated;
