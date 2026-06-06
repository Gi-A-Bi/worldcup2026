import { supabase } from "./supabase";
import type { BetWithNames } from "./types";

const BET_ERROR_MESSAGES: Record<string, string> = {
  INVALID_AMOUNT: "베팅 칩은 1 이상이어야 해요.",
  CATEGORY_NOT_FOUND: "카테고리를 찾을 수 없어요.",
  CATEGORY_NOT_OPEN: "마감된 카테고리에는 베팅할 수 없어요.",
  OPTION_MISMATCH: "옵션이 올바르지 않아요.",
  INSUFFICIENT_CHIPS: "보유 칩이 부족해요.",
};

/** 원자적 베팅 (RPC place_bet 호출) → 베팅 후 남은 칩 반환 */
export async function placeBet(input: {
  playerId: string;
  categoryId: string;
  optionId: string;
  amount: number;
}): Promise<number> {
  const { data, error } = await supabase.rpc("place_bet", {
    p_player_id: input.playerId,
    p_category_id: input.categoryId,
    p_option_id: input.optionId,
    p_amount: input.amount,
  });
  if (error) {
    // RPC 예외 메시지에서 코드 추출 → 한국어 안내
    const code = Object.keys(BET_ERROR_MESSAGES).find((c) =>
      error.message.includes(c)
    );
    if (code) throw new Error(BET_ERROR_MESSAGES[code]);
    if (error.message.includes("place_bet")) {
      throw new Error(
        "베팅 함수(place_bet)가 아직 없어요. supabase/place_bet.sql 을 실행해주세요."
      );
    }
    throw error;
  }
  return data as number;
}

/** 방의 모든 베팅(닉네임/옵션라벨 포함). 카테고리 id 목록으로 조회. */
export async function fetchBetsForCategories(
  categoryIds: string[]
): Promise<BetWithNames[]> {
  if (categoryIds.length === 0) return [];
  const { data, error } = await supabase
    .from("bets")
    .select("*, players(nickname), options(label)")
    .in("category_id", categoryIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as BetWithNames[]) ?? [];
}

export type BetAggregate = {
  total: number; // 카테고리 총 풀
  byOption: Map<string, number>; // option_id → 풀
  byPlayerOption: Map<string, number>; // `${player}:${option}` → 내가 그 옵션에 건 합
};

/** 한 카테고리의 베팅들을 풀/옵션별로 집계 */
export function aggregateBets(bets: { option_id: string; player_id: string; amount: number }[]): BetAggregate {
  const byOption = new Map<string, number>();
  const byPlayerOption = new Map<string, number>();
  let total = 0;
  for (const b of bets) {
    total += b.amount;
    byOption.set(b.option_id, (byOption.get(b.option_id) ?? 0) + b.amount);
    const k = `${b.player_id}:${b.option_id}`;
    byPlayerOption.set(k, (byPlayerOption.get(k) ?? 0) + b.amount);
  }
  return { total, byOption, byPlayerOption };
}
