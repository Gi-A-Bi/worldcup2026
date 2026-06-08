"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCategories, statusLabel } from "@/lib/categories";
import { aggregateBets, fetchBetsForCategories } from "@/lib/bets";
import { fetchTeams } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import { WORLD_CUP_GROUPS } from "@/lib/worldcupTeams";
import type {
  BetWithNames,
  CategoryWithOptions,
  Option,
  Team,
} from "@/lib/types";
import { useSession } from "@/components/SessionProvider";
import Flag from "@/components/Flag";

const TOP_OPTIONS = 6;

type Picker = { nickname: string; isMe: boolean };

export default function LivePage() {
  const { room, player } = useSession();
  const roomId = room?.id;

  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [bets, setBets] = useState<BetWithNames[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Set<string>>(new Set());

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
    fetchTeams(roomId)
      .then(setTeams)
      .catch(() => {});
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

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  function toggleDetail(id: string) {
    setDetail((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!room) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-pitch-50">🔴 라이브 현황</h1>
          <p className="text-sm text-pitch-50/60">
            누가 어디에 얼마 걸었는지 실시간으로 한눈에.
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
            const isAdvance = c.type === "advance";

            // 참여자별 요약
            const byPlayer = new Map<
              string,
              {
                nickname: string;
                total: number;
                picks: { label: string; amount: number }[];
              }
            >();
            for (const b of catBets) {
              const cur =
                byPlayer.get(b.player_id) ?? {
                  nickname: b.players?.nickname ?? "??",
                  total: 0,
                  picks: [],
                };
              cur.total += b.amount;
              cur.picks.push({
                label: b.options?.label ?? "??",
                amount: b.amount,
              });
              byPlayer.set(b.player_id, cur);
            }
            const playerRows = [...byPlayer.entries()].sort(
              (a, b) => b[1].total - a[1].total
            );

            // 옵션별 누가 골랐는지 (조별 뷰용)
            const pickersByOption = new Map<string, Picker[]>();
            for (const b of catBets) {
              const arr = pickersByOption.get(b.option_id) ?? [];
              arr.push({
                nickname: b.players?.nickname ?? "??",
                isMe: b.player_id === player?.id,
              });
              pickersByOption.set(b.option_id, arr);
            }

            const distrib = c.options
              .map((o) => ({ o, pool: agg.byOption.get(o.id) ?? 0 }))
              .filter((x) => x.pool > 0)
              .sort((a, b) => b.pool - a.pool);
            const top = distrib.slice(0, TOP_OPTIONS);
            const moreCount = distrib.length - top.length;
            const showDetail = detail.has(c.id);

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
                      {byPlayer.size}명 · {agg.total.toLocaleString()}칩
                    </span>
                  </div>
                </div>

                {agg.total === 0 ? (
                  <p className="mt-3 text-xs text-pitch-50/40">
                    아직 베팅이 없어요.
                  </p>
                ) : isAdvance ? (
                  /* 진출팀: 조별로 누가 골랐는지 */
                  <GroupedPickers
                    options={c.options}
                    teamById={teamById}
                    pickersByOption={pickersByOption}
                  />
                ) : (
                  <>
                    {/* 인기 옵션 (상위) */}
                    <ul className="mt-3 space-y-1.5">
                      {top.map(({ o, pool }) => {
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
                    {moreCount > 0 && (
                      <p className="mt-1.5 text-center text-[11px] text-pitch-50/40">
                        + {moreCount}개 옵션 더
                      </p>
                    )}

                    {/* 참여자별 요약 */}
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] text-pitch-50/50">
                        참여자별
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {playerRows.map(([pid, r]) => {
                          const isMe = pid === player?.id;
                          return (
                            <span
                              key={pid}
                              className={[
                                "rounded-full border px-2.5 py-1 text-[11px]",
                                isMe
                                  ? "border-gold-500/40 bg-gold-500/10 text-gold-200"
                                  : "border-pitch-700/40 bg-[#04130c] text-pitch-50/80",
                              ].join(" ")}
                            >
                              {r.nickname}{" "}
                              <span className="font-mono text-gold-300">
                                {r.total.toLocaleString()}
                              </span>
                              {r.picks.length > 1 && (
                                <span className="text-pitch-50/40">
                                  {" "}
                                  ·{r.picks.length}건
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* 상세 보기 토글 */}
                    <button
                      type="button"
                      onClick={() => toggleDetail(c.id)}
                      className="mt-2 text-[11px] text-pitch-400 hover:text-gold-300"
                    >
                      {showDetail ? "상세 닫기 ▲" : "상세 보기 ▼"}
                    </button>

                    {showDetail && (
                      <div className="mt-2 space-y-2 rounded-xl border border-pitch-700/40 bg-[#04130c] p-3">
                        {playerRows.map(([pid, r]) => (
                          <div key={pid}>
                            <p className="text-xs font-semibold text-pitch-50">
                              {r.nickname}{" "}
                              <span className="font-mono text-gold-300">
                                {r.total.toLocaleString()}칩
                              </span>
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.picks.map((p, i) => (
                                <span
                                  key={i}
                                  className="rounded border border-pitch-700/40 px-1.5 py-0.5 text-[10px] text-pitch-50/60"
                                >
                                  {p.label}{" "}
                                  <span className="font-mono text-gold-300/80">
                                    {p.amount.toLocaleString()}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 진출팀: 12개 조로 묶어 각 국가를 누가 골랐는지 표시 */
function GroupedPickers({
  options,
  teamById,
  pickersByOption,
}: {
  options: Option[];
  teamById: Map<string, Team>;
  pickersByOption: Map<string, Picker[]>;
}) {
  const byGroup = new Map<string, { o: Option; t: Team | undefined }[]>();
  for (const g of WORLD_CUP_GROUPS) byGroup.set(g, []);
  for (const o of options) {
    const t = o.team_id ? teamById.get(o.team_id) : undefined;
    const g = t?.group_label ?? "기타";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push({ o, t });
  }

  return (
    <div className="mt-3 space-y-3">
      {[...byGroup.entries()].map(([g, items]) =>
        items.length === 0 ? null : (
          <div key={g}>
            <p className="mb-1 text-[10px] font-semibold text-pitch-400">
              {g}조
            </p>
            <ul className="space-y-1">
              {items.map(({ o, t }) => {
                const pickers = pickersByOption.get(o.id) ?? [];
                return (
                  <li
                    key={o.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-pitch-700/40 bg-[#06180f] px-2.5 py-1.5"
                  >
                    <span className="flex shrink-0 items-center gap-1.5 text-sm text-pitch-50">
                      <Flag emoji={t?.flag_emoji} code={t?.fifa_code} />
                      {t?.name ?? o.label}
                    </span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {pickers.length === 0 ? (
                        <span className="text-[11px] text-pitch-50/25">—</span>
                      ) : (
                        pickers.map((p, i) => (
                          <span
                            key={i}
                            className={[
                              "rounded-full px-1.5 py-0.5 text-[10px]",
                              p.isMe
                                ? "bg-gold-500/20 text-gold-200"
                                : "bg-white/5 text-pitch-50/70",
                            ].join(" ")}
                          >
                            {p.nickname}
                          </span>
                        ))
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
