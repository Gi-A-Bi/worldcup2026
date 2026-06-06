"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories } from "@/lib/categories";
import { fetchBetsForCategories } from "@/lib/bets";
import { fetchPlayers } from "@/lib/rooms";
import { fetchSettlementsForCategories } from "@/lib/settlements";
import { supabase } from "@/lib/supabase";
import type {
  BetWithNames,
  CategoryWithOptions,
  Player,
  SettlementWithNames,
} from "@/lib/types";
import { useSession } from "@/components/SessionProvider";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const { room, player } = useSession();
  const roomId = room?.id;

  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [bets, setBets] = useState<BetWithNames[]>([]);
  const [settlements, setSettlements] = useState<SettlementWithNames[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!roomId) return;
    Promise.all([fetchPlayers(roomId), fetchCategories(roomId)])
      .then(async ([pl, cats]) => {
        setPlayers(pl);
        setCategories(cats);
        const ids = cats.map((c) => c.id);
        const [b, s] = await Promise.all([
          fetchBetsForCategories(ids),
          fetchSettlementsForCategories(ids),
        ]);
        setBets(b);
        setSettlements(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    refresh();
    const channel = supabase
      .channel(`room-rank-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlements" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        () => refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refresh]);

  // 최근 정산 델타: 플레이어별 가장 최근 settlement 의 net
  const latestDelta = useMemo(() => {
    const map = new Map<string, { net: number; at: string }>();
    for (const s of settlements) {
      const prev = map.get(s.player_id);
      if (!prev || s.created_at > prev.at) {
        map.set(s.player_id, { net: s.net, at: s.created_at });
      }
    }
    return map;
  }, [settlements]);

  // 카테고리 메타 (이름/상태) + 옵션 정답 맵
  const catMeta = useMemo(() => {
    const map = new Map<string, { name: string; status: string }>();
    for (const c of categories) map.set(c.id, { name: c.name, status: c.status });
    return map;
  }, [categories]);

  const correctMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const c of categories)
      for (const o of c.options) map.set(o.id, o.is_correct);
    return map;
  }, [categories]);

  // 내 묶인 칩 (미정산 카테고리 베팅) / 탈락 베팅 (정산됐고 못 맞힌 베팅)
  const { tiedRows, tiedTotal, bustedRows, bustedTotal } = useMemo(() => {
    const tied = new Map<string, number>(); // category_id → amount
    const busted: { cat: string; label: string; amount: number }[] = [];
    let tiedTotal = 0;
    let bustedTotal = 0;
    if (player) {
      for (const b of bets) {
        if (b.player_id !== player.id) continue;
        const meta = catMeta.get(b.category_id);
        if (!meta) continue;
        if (meta.status !== "resolved") {
          tied.set(b.category_id, (tied.get(b.category_id) ?? 0) + b.amount);
          tiedTotal += b.amount;
        } else if (correctMap.get(b.option_id) === false) {
          busted.push({
            cat: meta.name,
            label: b.options?.label ?? "?",
            amount: b.amount,
          });
          bustedTotal += b.amount;
        }
      }
    }
    const tiedRows = [...tied.entries()].map(([cid, amount]) => ({
      name: catMeta.get(cid)?.name ?? "?",
      amount,
    }));
    return { tiedRows, tiedTotal, bustedRows: busted, bustedTotal };
  }, [bets, player, catMeta, correctMap]);

  if (!room || !player) return null;

  const ranked = [...players].sort((a, b) => b.chips - a.chips);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">🏆 순위표</h1>
        <p className="text-sm text-pitch-50/60">보유 칩 기준 실시간 랭킹.</p>
      </header>

      {loading ? (
        <p className="py-6 text-center text-sm text-pitch-50/40">불러오는 중…</p>
      ) : (
        <>
          {/* 랭킹 */}
          <ul className="space-y-2">
            {ranked.map((p, i) => {
              const isMe = p.id === player.id;
              const delta = latestDelta.get(p.id)?.net;
              return (
                <li
                  key={p.id}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-4 py-3",
                    isMe
                      ? "border-gold-500/40 bg-gold-500/10"
                      : "border-pitch-700/40 bg-[#06180f]",
                  ].join(" ")}
                >
                  <span className="w-7 text-center text-lg font-bold text-pitch-50/80">
                    {MEDALS[i] ?? i + 1}
                  </span>
                  <span className="flex flex-1 items-center gap-2 text-sm font-medium text-pitch-50">
                    {p.nickname}
                    {isMe && (
                      <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] text-gold-300">
                        나
                      </span>
                    )}
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm font-bold text-gold-300">
                      {p.chips.toLocaleString()}
                      <span className="ml-1 text-[10px] text-pitch-50/40">
                        칩
                      </span>
                    </span>
                    {delta !== undefined && delta !== 0 && (
                      <span
                        className={`block font-mono text-[11px] ${
                          delta > 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta.toLocaleString()}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* 내 칩 요약 */}
          <section className="grid grid-cols-3 gap-2 text-center">
            <SummaryBox label="보유 칩" value={player.chips} accent="gold" />
            <SummaryBox label="묶인 칩" value={tiedTotal} accent="sky" />
            <SummaryBox
              label="합계"
              value={player.chips + tiedTotal}
              accent="pitch"
            />
          </section>

          {/* 묶인 칩 상세 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-pitch-50/70">
              🔒 묶인 칩{" "}
              <span className="text-pitch-50/40">
                (정산 대기 중인 내 베팅)
              </span>
            </h2>
            {tiedRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-pitch-700/40 px-3 py-4 text-center text-xs text-pitch-50/40">
                묶인 칩이 없어요.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tiedRows.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-sm"
                  >
                    <span className="text-pitch-50/80">{r.name}</span>
                    <span className="font-mono text-sky-300">
                      {r.amount.toLocaleString()}칩
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 탈락 베팅 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-pitch-50/70">
              💀 탈락 베팅{" "}
              <span className="text-pitch-50/40">
                (정산됐지만 못 맞힌 베팅)
              </span>
            </h2>
            {bustedRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-pitch-700/40 px-3 py-4 text-center text-xs text-pitch-50/40">
                탈락한 베팅이 없어요.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {bustedRows.map((r, idx) => (
                  <li
                    key={`${r.cat}-${r.label}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-pitch-50/70">
                      <span className="text-pitch-50/50">{r.cat}</span> ·{" "}
                      {r.label}
                    </span>
                    <span className="shrink-0 font-mono text-red-400">
                      −{r.amount.toLocaleString()}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between px-3 pt-1 text-xs text-pitch-50/50">
                  <span>합계</span>
                  <span className="font-mono text-red-400">
                    −{bustedTotal.toLocaleString()}칩
                  </span>
                </li>
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "gold" | "sky" | "pitch";
}) {
  const color =
    accent === "gold"
      ? "text-gold-300"
      : accent === "sky"
        ? "text-sky-300"
        : "text-pitch-300";
  return (
    <div className="rounded-xl border border-pitch-700/40 bg-pitch-900/30 px-2 py-3">
      <p className="text-[11px] text-pitch-50/50">{label}</p>
      <p className={`mt-0.5 font-mono text-base font-bold ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
