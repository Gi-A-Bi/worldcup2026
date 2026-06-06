-- =============================================================
-- (선택) options.team_id 외래키에 ON DELETE CASCADE 추가
-- =============================================================
-- 발견: 원본 스키마(CLAUDE.md §6)에서 options.team_id 는
--   `team_id uuid references teams(id)` 로 ON DELETE CASCADE 가 없다.
-- 영향: 방(room) 삭제 시 teams 가 cascade 로 지워지려 할 때,
--   그 팀을 참조하는 options 때문에 FK 위반으로 삭제가 막힌다.
--     ERROR: update or delete on table "teams" violates foreign key
--            constraint "options_team_id_fkey" on table "options"
--
-- 앱 정상 사용 흐름에서는 방/팀을 삭제하지 않으므로 당장은 문제없음.
-- 다만 방 정리/삭제를 하려면 아래로 FK 에 cascade 를 걸어두면 깔끔하다.
-- (실행은 선택 사항. Supabase SQL Editor 에서 한 번 실행.)
-- =============================================================

alter table options drop constraint if exists options_team_id_fkey;

alter table options
  add constraint options_team_id_fkey
  foreign key (team_id) references teams(id) on delete cascade;
