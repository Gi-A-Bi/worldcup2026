import { supabase } from "./supabase";
import type { BetLock } from "./types";

/** 여러 카테고리의 개인 확정 기록 조회 */
export async function fetchBetLocks(categoryIds: string[]): Promise<BetLock[]> {
  if (categoryIds.length === 0) return [];
  const { data, error } = await supabase
    .from("bet_locks")
    .select("*")
    .in("category_id", categoryIds);
  if (error) throw error;
  return (data as BetLock[]) ?? [];
}

/** 내 베팅 확정 (개인 마감) */
export async function confirmBets(playerId: string, categoryId: string) {
  const { error } = await supabase
    .from("bet_locks")
    .upsert(
      { player_id: playerId, category_id: categoryId },
      { onConflict: "player_id,category_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

/** 내 베팅 확정 해제 */
export async function unconfirmBets(playerId: string, categoryId: string) {
  const { error } = await supabase
    .from("bet_locks")
    .delete()
    .eq("player_id", playerId)
    .eq("category_id", categoryId);
  if (error) throw error;
}
