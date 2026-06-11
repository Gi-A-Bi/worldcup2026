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

  // 카테고리 + 베팅 + 확정을 한 번에 새로고침 (roomId 에만 의존 → 재구독 루프 방지)
  const refreshAll = useCallback(() => {
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

  // 베팅 직후: 목록 갱신 + 내 보유 칩 갱신
  const handleBet = useCallback(() => {
    refreshAll();
    void reload();
  }, [refreshAll, reload]);

  // 팀은 한 번만 로드
  useEffect(() => {
    if (!roomId) return;
    fetchTeams(roomId)
      .then(setTeams)
      .catch(() => {});
  }, [roomId]);

  // 최초 로드 + Realtime 구독 (변경 시 전체 새로고침)
  useEffect(() => {
    if (!roomId) return;
    refreshAll();
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
        () => refreshAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        () => refreshAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        () => refreshAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bet_locks" },
        () => refreshAll()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refreshAll]);

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
        refreshAll();
      } catch {
        // 무시 (실시간 구독이 보정)
      }
    },
    [player, refreshAll]
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
            • <b className="text-pitch-50">희소성 분배</b>(진출팀): 팀당 고정
            칩으로 32팀 선택 → 전체 칩을 진출팀 수로 나눠 각 팀 몫을 그 팀 고른
            사람끼리 분배. <b>남이 적게 고른 진출팀 적중일수록 큰 이익.</b>
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
        existingNames={categories.map((c) => c.name)}
        onCreated={refreshAll}
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
                onChanged={refreshAll}
                onBet={handleBet}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
