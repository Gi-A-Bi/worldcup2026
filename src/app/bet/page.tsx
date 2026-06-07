"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories } from "@/lib/categories";
import { fetchBetsForCategories } from "@/lib/bets";
import { confirmBets, fetchBetLocks, unconfirmBets } from "@/lib/betlocks";
import { fetchTeams } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import type {
  BetLock,
  BetWithNames,
  CategoryWithOptions,
  Team,
} from "@/lib/types";
import { useSession } from "@/components/SessionProvider";
import AddCategoryPanel from "@/components/AddCategoryPanel";
import CategoryCard from "@/components/CategoryCard";

export default function BetPage() {
  const { room, player, reload } = useSession();
  const roomId = room?.id;

  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [bets, setBets] = useState<BetWithNames[]>([]);
  const [betLocks, setBetLocks] = useState<BetLock[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(() => {
    if (!roomId) return;
    fetchCategories(roomId)
      .then(async (cats) => {
        setCategories(cats);
        const ids = cats.map((c) => c.id);
        const [b, locks] = await Promise.all([
          fetchBetsForCategories(ids),
          fetchBetLocks(ids),
        ]);
        setBets(b);
        setBetLocks(locks);
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

  const refreshLocks = useCallback(() => {
    if (categoryIds.length === 0) return;
    fetchBetLocks(categoryIds)
      .then(setBetLocks)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bet_locks" },
        () => refreshLocks()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refreshCategories, refreshBets, refreshLocks]);

  const betsByCategory = useMemo(() => {
    const map = new Map<string, BetWithNames[]>();
    for (const b of bets) {
      const arr = map.get(b.category_id) ?? [];
      arr.push(b);
      map.set(b.category_id, arr);
    }
    return map;
  }, [bets]);

  // 카테고리별 확정한 player_id 집합
  const confirmedByCategory = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of betLocks) {
      const set = map.get(l.category_id) ?? new Set<string>();
      set.add(l.player_id);
      map.set(l.category_id, set);
    }
    return map;
  }, [betLocks]);

  const toggleConfirm = useCallback(
    async (categoryId: string, currentlyConfirmed: boolean) => {
      if (!player) return;
      try {
        if (currentlyConfirmed) await unconfirmBets(player.id, categoryId);
        else await confirmBets(player.id, categoryId);
        refreshLocks();
      } catch {
        // 무시 (실시간 구독이 보정)
      }
    },
    [player, refreshLocks]
  );

  // 열림 → 마감 → 정산됨 순으로 정렬 (목록)
  const sortedCategories = useMemo(() => {
    const order: Record<string, number> = { open: 0, locked: 1, resolved: 2 };
    return [...categories].sort(
      (a, b) =>
        (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
        a.created_at.localeCompare(b.created_at)
    );
  }, [categories]);

  if (!room || !player) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">⚽ 베팅하기</h1>
        <p className="text-sm text-pitch-50/60">
          게임(카테고리)을 골라 펼친 뒤 칩을 걸어요. 풀·배당률은 실시간 갱신돼요.
        </p>
      </header>

      <details className="rounded-2xl border border-pitch-700/40 bg-pitch-900/30 px-4 py-3 text-sm text-pitch-50/70">
        <summary className="cursor-pointer font-semibold text-pitch-50/90">
          💡 배당률·베팅 방식이 궁금하다면
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
          <li>
            • <b className="text-pitch-50">배당률(×)</b>: 맞혔을 때 건 칩이 몇
            배가 되는지. <b>적게 몰린 곳일수록 높아요.</b> 마감 전까지 계속 변해요.
          </li>
          <li>
            • <b className="text-pitch-50">파리뮤추얼</b>(우승팀·득점왕·빅매치 등):
            한 곳을 골라 베팅 → 정답 맞힌 사람끼리 전체 칩을 나눠 가져요.
          </li>
          <li>
            • <b className="text-pitch-50">풀셰어</b>(진출팀): 여러 팀을 골라
            베팅 → 맞힌 팀에 건 칩 비율만큼 전체 칩을 나눠 가져요.
          </li>
          <li>
            • 보유 칩을 넘는 베팅은 불가, 취소도 불가. 마감 전까지 추가 베팅은
            가능해요.
          </li>
        </ul>
      </details>

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
        <div className="space-y-2">
          {sortedCategories.map((c) => {
            const confirmedSet = confirmedByCategory.get(c.id);
            return (
              <CategoryCard
                key={c.id}
                category={c}
                teams={teams}
                player={player}
                bets={betsByCategory.get(c.id) ?? []}
                roomId={room.id}
                iConfirmed={confirmedSet?.has(player.id) ?? false}
                confirmedCount={confirmedSet?.size ?? 0}
                onToggleConfirm={() =>
                  toggleConfirm(c.id, confirmedSet?.has(player.id) ?? false)
                }
                onChanged={refreshCategories}
                onBet={handleBet}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
