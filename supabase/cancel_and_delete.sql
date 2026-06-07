-- =============================================================
-- 확정 전 베팅 취소 허용(모든 카테고리) + 카테고리 삭제 RPC
-- =============================================================
-- Supabase SQL Editor 에서 한 번 실행.
-- =============================================================

-- 1) remove_bet: 'rarity 전용' 제한 제거 → 열림 + 확정 전이면 어떤 카테고리든 취소(환불)
create or replace function remove_bet(
  p_player_id   uuid,
  p_category_id uuid,
  p_option_id   uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status    text;
  v_refund    int;
  v_remaining int;
begin
  select status into v_status from categories where id = p_category_id;
  if v_status is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'CATEGORY_NOT_OPEN'; end if;
  if exists (select 1 from bet_locks where player_id = p_player_id and category_id = p_category_id) then
    raise exception 'ALREADY_CONFIRMED';
  end if;

  select coalesce(sum(amount), 0) into v_refund
    from bets where player_id = p_player_id and category_id = p_category_id and option_id = p_option_id;
  if v_refund = 0 then
    return (select chips from players where id = p_player_id);
  end if;

  delete from bets
   where player_id = p_player_id and category_id = p_category_id and option_id = p_option_id;
  update players set chips = chips + v_refund where id = p_player_id returning chips into v_remaining;
  return v_remaining;
end;
$$;
grant execute on function remove_bet(uuid, uuid, uuid) to anon, authenticated;

-- 2) delete_category: 카테고리 삭제(베팅 전액 환불 후 삭제). 정산된 건 삭제 금지.
create or replace function delete_category(
  p_category_id uuid,
  p_player_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room   uuid;
  v_status text;
  r        record;
begin
  select room_id, status into v_room, v_status from categories where id = p_category_id;
  if v_room is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status = 'resolved' then raise exception 'ALREADY_RESOLVED'; end if;

  -- 건 칩 전액 환불
  for r in select player_id, coalesce(sum(amount), 0) as tot
             from bets where category_id = p_category_id group by player_id
  loop
    update players set chips = chips + r.tot where id = r.player_id;
  end loop;

  insert into activity_log (room_id, player_id, action, meta)
  values (v_room, p_player_id, 'delete_category', jsonb_build_object('category_id', p_category_id));

  -- options/bets/settlements/bet_locks 는 cascade 로 함께 삭제
  delete from categories where id = p_category_id;
end;
$$;
grant execute on function delete_category(uuid, uuid) to anon, authenticated;
