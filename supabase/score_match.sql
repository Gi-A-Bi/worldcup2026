-- =============================================================
-- 스코어 맞추기 (스코어 우선 → 승무패 폴백) — 한국 경기용
-- =============================================================
-- Supabase SQL Editor 에서 한 번 실행. (멱등)
--
-- 옵션에 스코어(골 수) 저장:
--   - 격자 셀: home_goals 0~5(한국), away_goals 0~5(상대)
--   - '6골 이상' 버킷: home_goals=-1, away_goals=-1
--
-- 정산(resolve_score): 실제 스코어 입력 → 단계별 분배 (파리뮤추얼)
--   1) 정확한 스코어 맞힌 사람 있으면 → 그들이 풀 전부 (건 칩 비율)
--      (격자 밖 6골 이상 결과면 '6골 이상' 버킷이 정확 당첨)
--   2) 없으면 → 승무패(결과) 맞힌 사람들이 풀 분배 (버킷 제외)
--   3) 그것도 없으면 → 전원 환불
-- =============================================================

alter table options add column if not exists home_goals int;
alter table options add column if not exists away_goals int;

alter table categories drop constraint if exists categories_settlement_type_check;
alter table categories add constraint categories_settlement_type_check
  check (settlement_type in ('parimutuel', 'pool_share', 'rarity_share', 'score_cascade'));

create or replace function resolve_score(
  p_category_id uuid,
  p_home        int,
  p_away        int,
  p_player_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room    uuid;
  v_status  text;
  v_total   bigint;
  v_pool    bigint;
  v_result  int;
  v_payout  int;
  r         record;
begin
  select room_id, status into v_room, v_status from categories where id = p_category_id;
  if v_room is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status = 'resolved' then raise exception 'ALREADY_RESOLVED'; end if;
  if p_home is null or p_away is null or p_home < 0 or p_away < 0 then
    raise exception 'INVALID_SCORE';
  end if;

  v_result := case when p_home > p_away then 1 when p_home = p_away then 0 else -1 end;
  select coalesce(sum(amount), 0) into v_total from bets where category_id = p_category_id;

  -- 1) 정확한 스코어 단계 (격자 일치 또는 6골 이상 버킷)
  select coalesce(sum(b.amount), 0) into v_pool
  from bets b join options o on o.id = b.option_id
  where b.category_id = p_category_id
    and ( (o.home_goals = p_home and o.away_goals = p_away)
       or (o.home_goals = -1 and o.away_goals = -1 and (p_home > 5 or p_away > 5)) );

  if v_pool > 0 then
    update options set is_correct = (
      (home_goals = p_home and away_goals = p_away)
      or (home_goals = -1 and away_goals = -1 and (p_home > 5 or p_away > 5))
    ) where category_id = p_category_id;

    for r in
      select b.player_id,
             coalesce(sum(b.amount), 0) as total_bet,
             coalesce(sum(b.amount) filter (where
               (o.home_goals = p_home and o.away_goals = p_away)
               or (o.home_goals = -1 and o.away_goals = -1 and (p_home > 5 or p_away > 5))
             ), 0) as win_bet
        from bets b join options o on o.id = b.option_id
       where b.category_id = p_category_id
       group by b.player_id
    loop
      v_payout := floor(v_total::numeric * r.win_bet / v_pool);
      insert into settlements (player_id, category_id, payout, net)
      values (r.player_id, p_category_id, v_payout, v_payout - r.total_bet);
      update players set chips = chips + v_payout where id = r.player_id;
    end loop;

  else
    -- 2) 승무패 단계 (격자 셀만; 버킷 제외)
    select coalesce(sum(b.amount), 0) into v_pool
    from bets b join options o on o.id = b.option_id
    where b.category_id = p_category_id
      and o.home_goals >= 0 and o.away_goals >= 0
      and (case when o.home_goals > o.away_goals then 1
                when o.home_goals = o.away_goals then 0 else -1 end) = v_result;

    if v_pool > 0 then
      update options set is_correct = (
        home_goals >= 0 and away_goals >= 0
        and (case when home_goals > away_goals then 1
                  when home_goals = away_goals then 0 else -1 end) = v_result
      ) where category_id = p_category_id;

      for r in
        select b.player_id,
               coalesce(sum(b.amount), 0) as total_bet,
               coalesce(sum(b.amount) filter (where
                 o.home_goals >= 0 and o.away_goals >= 0
                 and (case when o.home_goals > o.away_goals then 1
                           when o.home_goals = o.away_goals then 0 else -1 end) = v_result
               ), 0) as win_bet
          from bets b join options o on o.id = b.option_id
         where b.category_id = p_category_id
         group by b.player_id
      loop
        v_payout := floor(v_total::numeric * r.win_bet / v_pool);
        insert into settlements (player_id, category_id, payout, net)
        values (r.player_id, p_category_id, v_payout, v_payout - r.total_bet);
        update players set chips = chips + v_payout where id = r.player_id;
      end loop;

    else
      -- 3) 전원 환불
      update options set is_correct = false where category_id = p_category_id;
      for r in select player_id, coalesce(sum(amount), 0) as tot
                 from bets where category_id = p_category_id group by player_id
      loop
        insert into settlements (player_id, category_id, payout, net)
        values (r.player_id, p_category_id, r.tot, 0);
        update players set chips = chips + r.tot where id = r.player_id;
      end loop;
    end if;
  end if;

  update categories set status = 'resolved', resolved_at = now() where id = p_category_id;
  insert into activity_log (room_id, player_id, action, meta)
  values (v_room, p_player_id, 'resolve_score',
          jsonb_build_object('category_id', p_category_id, 'score', p_home || ':' || p_away));
end;
$$;

grant execute on function resolve_score(uuid, int, int, uuid) to anon, authenticated;
