-- =============================================================
-- 월드컵 베팅 게임 — Supabase 스키마 (기록용)
-- =============================================================
-- ⚠️ 이 파일은 "기록/참고용"입니다.
--    실제 테이블은 이미 Supabase SQL Editor에서 생성 완료됨.
--    여기서 다시 실행할 필요 없음 (CLAUDE.md §6 기준).
-- =============================================================

-- 방 (베팅 게임 단위 = 하나의 토너먼트)
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                   -- 6자리 공유 코드
  name text not null,
  tournament_name text,                        -- 헤더에 표시되는 대회명
  initial_chips int default 10000,
  created_at timestamptz default now()
);

-- 참가자
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  nickname text not null,
  chips int default 10000,                     -- 현재 보유 칩 (베팅 시 차감, 정산 시 가산)
  created_at timestamptz default now(),
  unique(room_id, nickname)
);

-- 대회 참가 팀 (조별 명단 표시 + 베팅 옵션 생성의 단일 원천)
create table teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,                          -- 표시명 (예: '대한민국')
  group_label text not null,                   -- 'A' ~ 'L'
  flag_emoji text,                             -- 🇰🇷 등
  fifa_code text                               -- 'KOR' 등 (선택)
);

-- 베팅 카테고리
create table categories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  type text not null,                          -- 'winner' | 'advance' | 'topscorer' | 'match' | 'knockout' | 'custom'
  settlement_type text not null check (settlement_type in ('parimutuel', 'pool_share')),
  multi_select boolean default false,
  kickoff_at timestamptz,                      -- match 등 시각 표시용 (KST로 변환해 노출). 없으면 null
  status text default 'open' check (status in ('open', 'locked', 'resolved')),
  created_at timestamptz default now(),
  locked_at timestamptz,
  resolved_at timestamptz
);

-- 옵션 (선택지: 팀, 선수, 승/무/패 등). 팀 기반 카테고리는 teams에서 자동 생성.
create table options (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  team_id uuid references teams(id),           -- 팀 옵션이면 연결 (없으면 null)
  label text not null,
  is_correct boolean default false             -- 정산 시 정답 표시 (multi_select면 여러 개 true 가능)
);

-- 베팅 기록
create table bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  option_id uuid references options(id) on delete cascade,
  amount int not null check (amount > 0),
  created_at timestamptz default now()
);

-- 정산 결과
create table settlements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  payout int not null,                         -- 정산받은 칩
  net int not null,                            -- 손익 (payout - 해당 카테고리 총베팅)
  created_at timestamptz default now(),
  unique(player_id, category_id)               -- 중복 정산 방지
);

-- 변경 로그 (누가 카테고리 만들고 마감/정산했는지 추적)
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id uuid references players(id),
  action text not null,                        -- 'create_category', 'lock_category', 'resolve_category', 'bet' 등
  meta jsonb,
  created_at timestamptz default now()
);

-- 실시간 구독 활성화
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table options;
alter publication supabase_realtime add table bets;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table activity_log;

-- RLS: 방 코드 기반이라 초기엔 비활성화로 시작 (친구만 사용). 자세한 내용 CLAUDE.md §6 참고.
