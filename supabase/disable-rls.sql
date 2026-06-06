-- =============================================================
-- RLS 비활성화 (CLAUDE.md §6: "방 코드 기반이므로 초기엔 RLS 비활성화로 시작")
-- =============================================================
-- 증상: 앱에서 방 만들기/입장 시
--   "new row violates row-level security policy for table ..." 에러.
-- 원인: 테이블에 RLS가 켜져 있는데 anon 키 정책이 없어 읽기/쓰기가 막힘.
-- 해결: 아래를 Supabase SQL Editor 에서 한 번 실행.
--
-- ⚠️ anon 키는 브라우저에 노출되는 공개 키라, RLS를 끄면 방 코드 외엔
--    보호장치가 없다. 친구 한 그룹만 쓰면 OK. (CLAUDE.md §6 주의 참고)
--    나중에 보안 강화가 필요하면 방 코드를 헤더로 받는 RLS 정책으로 교체.
-- =============================================================

alter table rooms        disable row level security;
alter table players      disable row level security;
alter table teams        disable row level security;
alter table categories   disable row level security;
alter table options      disable row level security;
alter table bets         disable row level security;
alter table settlements  disable row level security;
alter table activity_log disable row level security;
