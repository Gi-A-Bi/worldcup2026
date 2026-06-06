"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories, settlementLabel, statusLabel } from "@/lib/categories";
import { aggregateBets, fetchBetsForCategories } from "@/lib/bets";
import { fetchTeams } from "@/lib/rooms";
import { fetchSettlementsForCategories } from "@/lib/settlements";
import { supabase } from "@/lib/supabase";
import type {
  BetWithNames,
  CategoryWithOptions,
  SettlementWithNames,
  Team,
} from "@/lib/types";
import { useSession } from "@/components/SessionProvider";
import ResultEntry from "@/components/ResultEntry";

export default function SettlementsPage() {
  const { room, player } = useSession();
  const roomId = room?.id;

  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [settlements, setSettlements] = useState<SettlementWithNames[]>([]);
  const [bets, setBets] = useState<BetWithNames[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    fetchTeams(roomId)
      .then(setTeams)
      .catch(() => {});
  }, [roomId]);

  const refresh = useCallback(() => {
    if (!roomId) return;
    fetchCategories(roomId)
      .then(async (cats) => {
        setCategories(cats);
        const ids = cats.map((c) => c.id);
        const [s, b] = await Promise.all([
          fetchSettlementsForCategories(ids),
          fetchBetsForCategories(ids),
        ]);
        setSettlements(s);
        setBets(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    refresh();
    const channel = supabase
      .channel(`room-settle-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlements" },
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

  const settleByCategory = useMemo(() => {
    const map = new Map<string, SettlementWithNames[]>();
    for (const s of settlements) {
      const arr = map.get(s.category_id) ?? [];
      arr.push(s);
      map.set(s.category_id, arr);
    }
    return map;
  }, [settlements]);

  if (!room || !player) return null;

  const resolved = categories.filter((c) => c.status === "resolved");
  const pending = categories.filter((c) => c.status !== "resolved");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">🧾 정산 내역</h1>
        <p className="text-sm text-pitch-50/60">
          정산된 카테고리의 결과와 승패를 확인해요.
        </p>
      </header>

      {loading ? (
        <p className="py-6 text-center text-sm text-pitch-50/40">불러오는 중…</p>
      ) : (
        <>
          {/* 경기 결과 입력 (정산 대기) */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-pitch-50/90">
                  📥 경기 결과 입력{" "}
                  <span className="text-pitch-50/40">({pending.length})</span>
                </h2>
                <p className="text-xs text-pitch-50/50">
                  실제 결과를 입력하면 자동으로 정산돼 아래 “정산 완료”에
                  표시돼요. (마감 안 했어도 입력 가능)
                </p>
              </div>
              {pending.map((c) => {
                const badge = statusLabel(c.status);
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-pitch-700/40 bg-pitch-900/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="truncate text-base font-bold text-pitch-50">
                        {c.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                    {c.options.length === 0 ? (
                      <p className="text-xs text-pitch-50/40">
                        옵션이 없어 정산할 수 없어요. (베팅 탭에서 옵션 추가)
                      </p>
                    ) : (
                      <ResultEntry
                        category={c}
                        teams={teams}
                        player={player}
                        bets={betsByCategory.get(c.id) ?? []}
                        onResolved={refresh}
                      />
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* 정산 완료 결과 */}
          <h2 className="text-sm font-semibold text-pitch-50/90">✅ 정산 완료</h2>
          {resolved.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-pitch-700/40 py-8 text-center text-sm text-pitch-50/40">
              아직 정산된 경기가 없어요.
            </p>
          ) : (
            <div className="space-y-3">
              {resolved.map((c) => {
                const catBets = betsByCategory.get(c.id) ?? [];
                const agg = aggregateBets(catBets);
                const correctOpts = c.options.filter((o) => o.is_correct);
                const correctPool = correctOpts.reduce(
                  (s, o) => s + (agg.byOption.get(o.id) ?? 0),
                  0
                );
                const refunded = correctPool === 0;
                const multiplier =
                  correctPool > 0 ? agg.total / correctPool : 0;
                const rows = (settleByCategory.get(c.id) ?? [])
                  .slice()
                  .sort((a, b) => b.net - a.net);
                return (
                  <section
                    key={c.id}
                    className="rounded-2xl border border-pitch-700/40 bg-pitch-900/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-pitch-50">
                          {c.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-pitch-50/50">
                          {settlementLabel(c.settlement_type)} · 풀{" "}
                          {agg.total.toLocaleString()}칩 ·{" "}
                          {refunded
                            ? "전원 환불"
                            : `배율 ${multiplier.toFixed(2)}×`}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        정산됨
                      </span>
                    </div>

                    {/* 정답 */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-xs text-pitch-50/50">정답:</span>
                      {correctOpts.length === 0 ? (
                        <span className="text-xs text-pitch-50/40">없음</span>
                      ) : (
                        correctOpts.map((o) => (
                          <span
                            key={o.id}
                            className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300"
                          >
                            {o.label}
                          </span>
                        ))
                      )}
                    </div>

                    {/* 승패 */}
                    {rows.length === 0 ? (
                      <p className="mt-3 text-xs text-pitch-50/40">
                        이 카테고리에 베팅한 사람이 없어요.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-1.5">
                        {rows.map((s) => {
                          const win = s.net > 0;
                          const lose = s.net < 0;
                          const isMe = s.player_id === player.id;
                          return (
                            <li
                              key={s.id}
                              className="flex items-center justify-between rounded-lg border border-pitch-700/40 bg-[#06180f] px-3 py-2 text-sm"
                            >
                              <span className="flex items-center gap-2 text-pitch-50">
                                {s.players?.nickname ?? "??"}
                                {isMe && (
                                  <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[10px] text-gold-300">
                                    나
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-3 font-mono text-xs">
                                <span className="text-pitch-50/60">
                                  +{s.payout.toLocaleString()}칩
                                </span>
                                <span
                                  className={
                                    win
                                      ? "text-emerald-400"
                                      : lose
                                        ? "text-red-400"
                                        : "text-pitch-50/50"
                                  }
                                >
                                  {win ? "+" : ""}
                                  {s.net.toLocaleString()}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
