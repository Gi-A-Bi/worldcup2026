"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories } from "@/lib/categories";
import { fetchBetsForCategories } from "@/lib/bets";
import { fetchTeams } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import type { BetWithNames, CategoryWithOptions, Team } from "@/lib/types";
import { useSession } from "@/components/SessionProvider";
import AddCategoryPanel from "@/components/AddCategoryPanel";
import CategoryCard from "@/components/CategoryCard";

export default function BetPage() {
  const { room, player, reload } = useSession();
  const roomId = room?.id;

  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [bets, setBets] = useState<BetWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(() => {
    if (!roomId) return;
    fetchCategories(roomId)
      .then(async (cats) => {
        setCategories(cats);
        setBets(await fetchBetsForCategories(cats.map((c) => c.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const refreshBets = useCallback(() => {
    if (categoryIds.length === 0) return;
    fetchBetsForCategories(categoryIds)
      .then(setBets)
      .catch(() => {});
  }, [categoryIds]);

  // 베팅 직후: 베팅 목록 + 내 보유 칩 갱신
  const handleBet = useCallback(() => {
    refreshBets();
    void reload();
  }, [refreshBets, reload]);

  // 팀은 한 번만 로드
  useEffect(() => {
    if (!roomId) return;
    fetchTeams(roomId)
      .then(setTeams)
      .catch(() => {});
  }, [roomId]);

  // 카테고리/옵션 + 베팅: 최초 로드 + Realtime 구독
  useEffect(() => {
    if (!roomId) return;
    refreshCategories();
    const channel = supabase
      .channel(`room-bet-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `room_id=eq.${roomId}`,
        },
        () => refreshCategories()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        () => refreshCategories()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        () => refreshBets()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refreshCategories, refreshBets]);

  const betsByCategory = useMemo(() => {
    const map = new Map<string, BetWithNames[]>();
    for (const b of bets) {
      const arr = map.get(b.category_id) ?? [];
      arr.push(b);
      map.set(b.category_id, arr);
    }
    return map;
  }, [bets]);

  if (!room || !player) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">⚽ 베팅하기</h1>
        <p className="text-sm text-pitch-50/60">
          옵션을 골라 칩을 걸어요. 풀·배당률은 실시간으로 갱신돼요.
        </p>
      </header>

      <AddCategoryPanel
        teams={teams}
        roomId={room.id}
        playerId={player.id}
        onCreated={refreshCategories}
      />

      {loading ? (
        <p className="py-6 text-center text-sm text-pitch-50/40">
          불러오는 중…
        </p>
      ) : categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-pitch-700/40 py-8 text-center text-sm text-pitch-50/40">
          아직 카테고리가 없어요. 위에서 추가해보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              teams={teams}
              player={player}
              bets={betsByCategory.get(c.id) ?? []}
              roomId={room.id}
              onChanged={refreshCategories}
              onBet={handleBet}
            />
          ))}
        </div>
      )}
    </div>
  );
}
