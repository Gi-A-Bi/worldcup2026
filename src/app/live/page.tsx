"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories, statusLabel } from "@/lib/categories";
import { aggregateBets, fetchBetsForCategories } from "@/lib/bets";
import { supabase } from "@/lib/supabase";
import type { BetWithNames, CategoryWithOptions } from "@/lib/types";
import { useSession } from "@/components/SessionProvider";

export default function LivePage() {
  const { room } = useSession();
  const roomId = room?.id;

  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [bets, setBets] = useState<BetWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!roomId) return;
    fetchCategories(roomId)
      .then(async (cats) => {
        setCategories(cats);
        setBets(await fetchBetsForCategories(cats.map((c) => c.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    refresh();
    const channel = supabase
      .channel(`room-live-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `room_id=eq.${roomId}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refresh]);

  const betsByCategory = useMemo(() => {
    const map = new Map<string, BetWithNames[]>();
    for (const b of bets) {
      const arr = map.get(b.category_id) ?? [];
      arr.push(b);
      map.set(b.category_id, arr);
    }
    return map;
  }, [bets]);

  if (!room) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-pitch-50">🔴 라이브 현황</h1>
          <p className="text-sm text-pitch-50/60">
            모든 참여자의 베팅이 실시간으로 갱신돼요.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          LIVE
        </span>
      </header>

      {loading ? (
        <p className="py-6 text-center text-sm text-pitch-50/40">불러오는 중…</p>
      ) : categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-pitch-700/40 py-8 text-center text-sm text-pitch-50/40">
          아직 카테고리가 없어요.
        </p>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => {
            const catBets = betsByCategory.get(c.id) ?? [];
            const agg = aggregateBets(catBets);
            const badge = statusLabel(c.status);
            const isParimutuel = c.settlement_type === "parimutuel";
            return (
              <section
                key={c.id}
                className="rounded-2xl border border-pitch-700/40 bg-pitch-900/30 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-base font-bold text-pitch-50">
                    {c.name}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                    <span className="font-mono text-[11px] text-pitch-50/50">
                      풀 {agg.total.toLocaleString()}칩
                    </span>
                  </div>
                </div>

                {/* 옵션 분포 */}
                {agg.total === 0 ? (
                  <p className="mt-3 text-xs text-pitch-50/40">
                    아직 베팅이 없어요.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {c.options
                      .map((o) => ({
                        o,
                        pool: agg.byOption.get(o.id) ?? 0,
                      }))
                      .filter((x) => x.pool > 0)
                      .sort((a, b) => b.pool - a.pool)
                      .map(({ o, pool }) => {
                        const pct = (pool / agg.total) * 100;
                        const odds = pool > 0 ? agg.total / pool : 0;
                        return (
                          <li
                            key={o.id}
                            className="relative overflow-hidden rounded-lg border border-pitch-700/40 bg-[#06180f] px-3 py-2"
                          >
                            <span
                              className="absolute inset-y-0 left-0 bg-pitch-600/20"
                              style={{ width: `${pct}%` }}
                              aria-hidden
                            />
                            <span className="relative flex items-center justify-between gap-2">
                              <span className="truncate text-sm text-pitch-50">
                                {o.label}
                              </span>
                              <span className="shrink-0 text-right font-mono text-xs">
                                <span className="text-pitch-50/70">
                                  {pool.toLocaleString()}칩 · {pct.toFixed(0)}%
                                </span>
                                {isParimutuel && (
                                  <span className="ml-1 text-gold-300">
                                    {odds.toFixed(2)}×
                                  </span>
                                )}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}

                {/* 베팅 내역 (공개) */}
                {catBets.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {catBets.map((b) => (
                      <span
                        key={b.id}
                        className="rounded-full border border-pitch-700/40 bg-[#04130c] px-2.5 py-1 text-[11px] text-pitch-50/70"
                      >
                        <span className="text-pitch-50">
                          {b.players?.nickname ?? "??"}
                        </span>{" "}
                        → {b.options?.label ?? "??"}{" "}
                        <span className="font-mono text-gold-300">
                          {b.amount.toLocaleString()}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
