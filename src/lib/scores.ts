import { createCategory, type NewOption } from "./categories";
import { supabase } from "./supabase";
import type { CategoryWithOptions, Team } from "./types";

export const KOREA_NAME = "대한민국";
export const SCORE_MAX = 5; // 격자 0~5골

/** 스코어 격자 옵션(0~5 × 0~5) + '6골 이상' 버킷 */
export function buildScoreOptions(): NewOption[] {
  const opts: NewOption[] = [];
  for (let h = 0; h <= SCORE_MAX; h++) {
    for (let a = 0; a <= SCORE_MAX; a++) {
      opts.push({ label: `${h} : ${a}`, home_goals: h, away_goals: a });
    }
  }
  opts.push({ label: "6골 이상", home_goals: -1, away_goals: -1 });
  return opts;
}

/** 한국과 같은 조의 상대 팀들 */
export function koreaOpponents(teams: Team[]): Team[] {
  const korea = teams.find((t) => t.name === KOREA_NAME);
  if (!korea) return [];
  return teams.filter(
    (t) => t.group_label === korea.group_label && t.id !== korea.id
  );
}

/** 한국 경기(스코어) 카테고리 생성 */
export async function createKoreaMatch(input: {
  roomId: string;
  playerId: string;
  opponent: Team;
  kickoffAt?: string | null;
}): Promise<CategoryWithOptions> {
  return createCategory({
    roomId: input.roomId,
    playerId: input.playerId,
    name: `🇰🇷 한국 vs ${input.opponent.name}`,
    type: "match",
    settlementType: "score_cascade",
    multiSelect: false,
    kickoffAt: input.kickoffAt ?? null,
    options: buildScoreOptions(),
  });
}

/** 스코어 정산 (RPC resolve_score, 2단 분배) */
export async function resolveScore(input: {
  categoryId: string;
  home: number;
  away: number;
  playerId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("resolve_score", {
    p_category_id: input.categoryId,
    p_home: input.home,
    p_away: input.away,
    p_player_id: input.playerId,
  });
  if (error) {
    if (error.message.includes("ALREADY_RESOLVED"))
      throw new Error("이미 정산된 경기예요.");
    if (error.message.includes("INVALID_SCORE"))
      throw new Error("스코어를 올바르게 입력하세요.");
    if (error.message.includes("resolve_score"))
      throw new Error(
        "정산 함수가 아직 없어요. supabase/score_match.sql 을 실행해주세요."
      );
    throw error;
  }
}
