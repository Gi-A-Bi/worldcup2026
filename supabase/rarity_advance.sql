-- =============================================================
-- 진출팀 "희소성 보너스" 구조 + 시작 칩 100,000 + 확정 전 수정
-- =============================================================
-- ⚠️ 이 스크립트는 MAIN 게임의 칩/베팅/정산을 초기화합니다(새 규칙 시작).
--    Supabase SQL Editor 에서 한 번 실행하세요.
--
-- 변경 요약
--  1) 시작 칩 10,000 → 100,000 (기존 참가자도 리셋)
--  2) 진출팀 정산 = 희소성 분배(rarity_share):
--     - 전체 풀을 '진출(정답) 팀 수'로 균등 배분 → 각 팀 몫을 그 팀 고른 사람끼리 분배
--     - 남이 안 고른 진출팀을 맞히면 그 팀 몫을 적게 나눠 → 더 큰 이익
--  3) 베팅 수정용 remove_bet RPC (확정 전 + 열림 + rarity 카테고리만 환불 삭제)
--  4) place_bet: 이미 확정(bet_locks)한 카테고리엔 추가 베팅 금지
-- =============================================================

-- 1) 시작 칩 100,000 + 기존 데이터 초기화 -------------------------------
update rooms set initial_chips = 100000 where code = 'MAIN';

-- 기존 베팅/정산/확정 초기화 (칩 스케일·정산식이 바뀌므로 깨끗이 시작)
delete from bet_locks   where category_id in (select id from categories where room_id = (select id from rooms where code='MAIN'));
delete from settlements where category_id in (select id from categories where room_id = (select id from rooms where code='MAIN'));
delete from bets        where category_id in (select id from categories where room_id = (select id from rooms where code='MAIN'));
update options set is_correct = false
  where category_id in (select id from categories where room_id = (select id from rooms where code='MAIN'));
update categories set status='open', locked_at=null, resolved_at=null
  where room_id = (select id from rooms where code='MAIN');

-- 참가자 보유 칩 리셋
update players set chips = 100000 where room_id = (select id from rooms where code='MAIN');

-- 2) settlement_type 에 rarity_share 허용 + 기존 진출팀 전환 -----------
alter table categories drop constraint if exists categories_settlement_type_check;
alter table categories add constraint categories_settlement_type_check
  check (settlement_type in ('parimutuel', 'pool_share', 'rarity_share'));

update categories set settlement_type = 'rarity_share'
  where room_id = (select id from rooms where code='MAIN') and type = 'advance';

-- 3) 정산 RPC: settlement_type 별 분기 (rarity_share 추가) --------------
create or replace function resolve_category(
  p_category_id        uuid,
  p_correct_option_ids uuid[],
  p_player_id          uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id      uuid;
  v_status       text;
  v_settlement   text;
  v_total        bigint;
  v_correct_pool bigint;
  v_num_teams    int;
  v_payout       int;
  r              record;
begin
  select room_id, status, settlement_type
    into v_room_id, v_status, v_settlement
  from categories where id = p_category_id;
  if v_room_id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status = 'resolved' then raise exception 'ALREADY_RESOLVED'; end if;

  update options set is_correct = (id = any(p_correct_option_ids))
   where category_id = p_category_id;

  select coalesce(sum(amount), 0) into v_total
    from bets where category_id = p_category_id;

  if v_settlement = 'rarity_share' then
    -- 진출(정답) 팀 중 '누군가 고른' 팀 수
    select count(distinct option_id) into v_num_teams
      from bets
     where category_id = p_category_id and option_id = any(p_correct_option_ids);

    if v_num_teams = 0 then
      -- 아무도 진출팀을 못 고름 → 전원 환불
      for r in select player_id, coalesce(sum(amount), 0) as tot
                 from bets where category_id = p_category_id group by player_id
      loop
        insert into settlements (player_id, category_id, payout, net)
        values (r.player_id, p_category_id, r.tot, 0);
        update players set chips = chips + r.tot where id = r.player_id;
      end loop;
    else
      for r in
        with picks as (
          select option_id, count(*)::numeric as pickers
            from bets
           where category_id = p_category_id and option_id = any(p_correct_option_ids)
           group by option_id
        ),
        pay as (
          select b.player_id,
                 sum((v_total::numeric / v_num_teams) / pk.pickers) as payout
            from bets b
            join picks pk on pk.option_id = b.option_id
           where b.category_id = p_category_id
             and b.option_id = any(p_correct_option_ids)
           group by b.player_id
        )
        select pl.player_id,
               coalesce(pay.payout, 0) as payout,
               (select coalesce(sum(amount), 0) from bets bb
                 where bb.category_id = p_category_id and bb.player_id = pl.player_id) as tot
          from (select distinct player_id from bets where category_id = p_category_id) pl
          left join pay on pay.player_id = pl.player_id
      loop
        v_payout := floor(r.payout);
        insert into settlements (player_id, category_id, payout, net)
        values (r.player_id, p_category_id, v_payout, v_payout - r.tot);
        update players set chips = chips + v_payout where id = r.player_id;
      end loop;
    end if;

  else
    -- parimutuel / pool_share (금액 비율 통합)
    select coalesce(sum(amount), 0) into v_correct_pool
      from bets
     where category_id = p_category_id and option_id = any(p_correct_option_ids);

    for r in
      select b.player_id,
             coalesce(sum(b.amount), 0) as total_bet,
             coalesce(sum(b.amount) filter (where b.option_id = any(p_correct_option_ids)), 0) as correct_bet
        from bets b
       where b.category_id = p_category_id
       group by b.player_id
    loop
      if v_correct_pool = 0 then
        v_payout := r.total_bet;
      else
        v_payout := floor(v_total::numeric * r.correct_bet / v_correct_pool);
      end if;
      insert into settlements (player_id, category_id, payout, net)
      values (r.player_id, p_category_id, v_payout, v_payout - r.total_bet);
      update players set chips = chips + v_payout where id = r.player_id;
    end loop;
  end if;

  update categories set status = 'resolved', resolved_at = now()
   where id = p_category_id;
  insert into activity_log (room_id, player_id, action, meta)
  values (v_room_id, p_player_id, 'resolve_category',
          jsonb_build_object('category_id', p_category_id, 'correct', to_jsonb(p_correct_option_ids)));
end;
$$;
grant execute on function resolve_category(uuid, uuid[], uuid) to anon, authenticated;

-- 4) place_bet: 확정한 카테고리엔 베팅 금지 (나머지 동일) -----------------
create or replace function place_bet(
  p_player_id   uuid,
  p_category_id uuid,
  p_option_id   uuid,
  p_amount      int
)
returns int
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
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select room_id, status into v_room_id, v_status from categories where id = p_category_id;
  if v_room_id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'CATEGORY_NOT_OPEN'; end if;

  if exists (select 1 from bet_locks where player_id = p_player_id and category_id = p_category_id) then
    raise exception 'ALREADY_CONFIRMED';
  end if;

  select category_id into v_opt_cat from options where id = p_option_id;
  if v_opt_cat is null or v_opt_cat <> p_category_id then raise exception 'OPTION_MISMATCH'; end if;

  update players set chips = chips - p_amount
   where id = p_player_id and room_id = v_room_id and chips >= p_amount
  returning chips into v_remaining;
  if v_remaining is null then raise exception 'INSUFFICIENT_CHIPS'; end if;

  insert into bets (player_id, category_id, option_id, amount)
  values (p_player_id, p_category_id, p_option_id, p_amount);

  insert into activity_log (room_id, player_id, action, meta)
  values (v_room_id, p_player_id, 'bet',
          jsonb_build_object('category_id', p_category_id, 'option_id', p_option_id, 'amount', p_amount));

  return v_remaining;
end;
$$;
grant execute on function place_bet(uuid, uuid, uuid, int) to anon, authenticated;

-- 5) remove_bet: 확정 전 베팅 수정용(환불 삭제). rarity 카테고리만 -------
create or replace function remove_bet(
  p_player_id   uuid,
  p_category_id uuid,
  p_option_id   uuid
)
returns int                       -- 환불 후 남은 칩
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status     text;
  v_settlement text;
  v_refund     int;
  v_remaining  int;
begin
  select status, settlement_type into v_status, v_settlement
    from categories where id = p_category_id;
  if v_status is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'CATEGORY_NOT_OPEN'; end if;
  if v_settlement <> 'rarity_share' then raise exception 'NOT_EDITABLE'; end if;
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
