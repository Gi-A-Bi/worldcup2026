-- =============================================================
-- 정산 RPC: resolve_category  (CLAUDE.md §5 정산 로직 + 안전장치)
-- =============================================================
-- ⚠️ Stage 5 동작에 필수. Supabase SQL Editor 에서 한 번 실행하세요.
--
-- 계산(파리뮤추얼/풀셰어 통합, 100% 환원·수수료 없음):
--   배당금 = 총풀 × (내가 '정답'에 건 칩 합 / 모두가 '정답'에 건 칩 합)
--   - parimutuel(단일정답) / pool_share(복수정답) 모두 같은 공식.
--   - 정답에 아무도 안 걸었으면(분모 0) → 그 카테고리 전원에게 자기 베팅액 환불.
--   net = 배당금 - 내 해당 카테고리 총 베팅
--
-- 안전장치:
--   - status='resolved' 면 예외(ALREADY_RESOLVED). settlements 의
--     unique(player_id, category_id) 가 동시/중복 정산을 최종 차단.
--   - 함수 전체가 단일 트랜잭션이라 칩 가산/기록이 원자적.
-- =============================================================

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
  v_total        bigint;
  v_correct_pool bigint;
  v_payout       int;
  r              record;
begin
  select room_id, status into v_room_id, v_status
  from categories where id = p_category_id;
  if v_room_id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if v_status = 'resolved' then raise exception 'ALREADY_RESOLVED'; end if;

  -- 정답 표시 (is_correct)
  update options
     set is_correct = (id = any(p_correct_option_ids))
   where category_id = p_category_id;

  -- 총 풀 / 정답 풀
  select coalesce(sum(amount), 0) into v_total
    from bets where category_id = p_category_id;
  select coalesce(sum(amount), 0) into v_correct_pool
    from bets
   where category_id = p_category_id
     and option_id = any(p_correct_option_ids);

  -- 베팅한 플레이어별 정산
  for r in
    select b.player_id,
           coalesce(sum(b.amount), 0) as total_bet,
           coalesce(sum(b.amount) filter (where b.option_id = any(p_correct_option_ids)), 0) as correct_bet
      from bets b
     where b.category_id = p_category_id
     group by b.player_id
  loop
    if v_correct_pool = 0 then
      v_payout := r.total_bet;                                   -- 전원 환불
    else
      v_payout := floor(v_total::numeric * r.correct_bet / v_correct_pool);
    end if;

    insert into settlements (player_id, category_id, payout, net)
    values (r.player_id, p_category_id, v_payout, v_payout - r.total_bet);

    update players set chips = chips + v_payout where id = r.player_id;
  end loop;

  update categories
     set status = 'resolved', resolved_at = now()
   where id = p_category_id;

  insert into activity_log (room_id, player_id, action, meta)
  values (
    v_room_id, p_player_id, 'resolve_category',
    jsonb_build_object('category_id', p_category_id, 'correct', to_jsonb(p_correct_option_ids))
  );
end;
$$;

grant execute on function resolve_category(uuid, uuid[], uuid) to anon, authenticated;
