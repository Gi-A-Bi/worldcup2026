-- =============================================================
-- 베팅 RPC: place_bet  (CLAUDE.md §5 "잔액 검사 + 차감"을 한 트랜잭션으로)
-- =============================================================
-- ⚠️ Stage 4 동작에 필수. Supabase SQL Editor 에서 한 번 실행하세요.
--
-- 원자성: 함수 전체가 단일 트랜잭션. 핵심은 아래 UPDATE 한 줄로
--   "chips >= amount 확인 + 차감"을 동시에 수행해, 동시 베팅 시에도
--   잔액이 음수가 되거나 어긋나지 않게 한다(0건 갱신=잔액부족).
--
-- 보안: SECURITY DEFINER + search_path 고정. 나중에 RLS 를 켜더라도
--   이 함수가 통제된 쓰기 경로가 된다. anon 은 EXECUTE 만 있으면 됨.
-- =============================================================

create or replace function place_bet(
  p_player_id   uuid,
  p_category_id uuid,
  p_option_id   uuid,
  p_amount      int
)
returns int                       -- 베팅 후 남은 보유 칩
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id   uuid;
  v_status    text;
  v_opt_cat   uuid;
  v_remaining int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- 카테고리: 존재 + 열림 상태 + room_id 확보
  select room_id, status into v_room_id, v_status
  from categories where id = p_category_id;
  if v_room_id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'CATEGORY_NOT_OPEN'; end if;

  -- 옵션이 해당 카테고리 소속인지 검증
  select category_id into v_opt_cat from options where id = p_option_id;
  if v_opt_cat is null or v_opt_cat <> p_category_id then
    raise exception 'OPTION_MISMATCH';
  end if;

  -- 핵심: 잔액 검사 + 차감 (원자적). 잔액 부족이면 0건 갱신 → v_remaining null
  update players
     set chips = chips - p_amount
   where id = p_player_id
     and room_id = v_room_id
     and chips >= p_amount
  returning chips into v_remaining;

  if v_remaining is null then
    raise exception 'INSUFFICIENT_CHIPS';
  end if;

  -- 베팅 기록
  insert into bets (player_id, category_id, option_id, amount)
  values (p_player_id, p_category_id, p_option_id, p_amount);

  -- 변경 로그
  insert into activity_log (room_id, player_id, action, meta)
  values (
    v_room_id, p_player_id, 'bet',
    jsonb_build_object('category_id', p_category_id, 'option_id', p_option_id, 'amount', p_amount)
  );

  return v_remaining;
end;
$$;

-- anon / authenticated 가 RPC 호출 가능하도록 (Supabase 기본 역할)
grant execute on function place_bet(uuid, uuid, uuid, int) to anon, authenticated;
