import { supabase } from "./supabase";
import type { SettlementWithNames } from "./types";

const RESOLVE_ERROR_MESSAGES: Record<string, string> = {
  CATEGORY_NOT_FOUND: "카테고리를 찾을 수 없어요.",
  ALREADY_RESOLVED: "이미 정산된 카테고리예요.",
};

/** 카테고리 정산 (RPC resolve_category). 정답 옵션 id 목록을 넘긴다. */
export async function resolveCategory(input: {
  categoryId: string;
  correctOptionIds: string[];
  playerId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("resolve_category", {
    p_category_id: input.categoryId,
    p_correct_option_ids: input.correctOptionIds,
    p_player_id: input.playerId,
  });
  if (error) {
    const code = Object.keys(RESOLVE_ERROR_MESSAGES).find((c) =>
      error.message.includes(c)
    );
    if (code) throw new Error(RESOLVE_ERROR_MESSAGES[code]);
    // unique(player_id, category_id) 위반 → 중복/동시 정산
    if (error.code === "23505" || error.message.includes("duplicate")) {
      throw new Error("이미 정산된 카테고리예요.");
    }
    if (error.message.includes("resolve_category")) {
      throw new Error(
        "정산 함수(resolve_category)가 아직 없어요. supabase/resolve_category.sql 을 실행해주세요."
      );
    }
    throw error;
  }
}

/** 카테고리 id 목록에 대한 정산 결과 조회 (닉네임 포함) */
export async function fetchSettlementsForCategories(
  categoryIds: string[]
): Promise<SettlementWithNames[]> {
  if (categoryIds.length === 0) return [];
  const { data, error } = await supabase
    .from("settlements")
    .select("*, players(nickname)")
    .in("category_id", categoryIds)
    .order("net", { ascending: false });
  if (error) throw error;
  return (data as SettlementWithNames[]) ?? [];
}
