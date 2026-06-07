-- =============================================================
-- bet_locks RLS 비활성화 (개인 확정 기록 삽입이 막히는 문제 수정)
-- =============================================================
-- 증상: '내 베팅 확정' 시 또는 bet_locks insert 시
--   "new row violates row-level security policy for table bet_locks"
-- 원인: 이 프로젝트는 새 테이블에 RLS 가 켜짐. (다른 테이블처럼 꺼줘야 함)
-- Supabase SQL Editor 에서 실행.
-- =============================================================

alter table bet_locks disable row level security;
grant select, insert, update, delete on bet_locks to anon, authenticated;
