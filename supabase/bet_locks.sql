-- =============================================================
-- 개인 베팅 확정(개인 마감) 저장 테이블
-- =============================================================
-- 각 참가자가 "이 게임은 내 베팅 끝!"이라고 개인적으로 잠그는 용도.
-- 전체 마감(categories.status='locked')과 별개 — 남들은 계속 베팅 가능.
-- Supabase SQL Editor 에서 한 번 실행. (멱등)
-- =============================================================

create table if not exists bet_locks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  created_at timestamptz default now(),
  unique (player_id, category_id)
);

alter table bet_locks disable row level security;

grant select, insert, update, delete on bet_locks to anon, authenticated;

-- 실시간 구독 (이미 추가돼 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bet_locks'
  ) then
    alter publication supabase_realtime add table bet_locks;
  end if;
end $$;
