"use client";

import { useMemo, useRef, useState } from "react";
import { placeBet, removeBet } from "@/lib/bets";
import { KOREA_NAME } from "@/lib/scores";
import type { BetWithNames, CategoryWithOptions, Option, Player, Team } from "@/lib/types";
import Flag from "@/components/Flag";

const GOAL_CHOICES = [0, 1, 2, 3, 4, 5, 6]; // 6 = 6골 이상

type Row = { key: number; home: number; away: number; amount: number };

/**
 * 스코어 맞추기 베팅 UI (콤보박스 폼).
 * 한국 골 / 상대 골을 골라(0~5, 6+) 가운데 승무패가 자동 표시, 오른쪽에 금액.
 * '스코어 추가'로 여러 줄 베팅. 확정 전 취소(환불) 자유.
 */
export default function ScoreGridBet({
  category,
  teams,
  player,
  bets,
  iConfirmed,
  confirmedCount,
  onToggleConfirm,
  onBet,
}: {
  category: CategoryWithOptions;
  teams: Team[];
  player: Player;
  bets: BetWithNames[];
  iConfirmed: boolean;
  confirmedCount: number;
  onToggleConfirm?: () => void;
  onBet: () => void;
}) {
  const options = useMemo(() => category.options ?? [], [category.options]);

  // 상대팀(카테고리 이름 "🇰🇷 한국 vs 멕시코"에서 추출)
  const opponent = useMemo(() => {
    const nm = category.name.split("vs").pop()?.trim() ?? "";
    return teams.find((t) => t.name === nm);
  }, [category.name, teams]);
  const korea = useMemo(() => teams.find((t) => t.name === KOREA_NAME), [teams]);

  const lookup = useMemo(() => {
    const m = new Map<string, Option>();
    let bucket: Option | undefined;
    for (const o of options) {
      if (o.home_goals === -1) bucket = o;
      else if (o.home_goals != null && o.away_goals != null)
        m.set(`${o.home_goals}_${o.away_goals}`, o);
    }
    return { m, bucket };
  }, [options]);

  function optionFor(home: number, away: number): Option | undefined {
    if (home >= 6 || away >= 6) return lookup.bucket;
    return lookup.m.get(`${home}_${away}`);
  }

  const myByOption = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bets)
      if (b.player_id === player.id)
        m.set(b.option_id, (m.get(b.option_id) ?? 0) + b.amount);
    return m;
  }, [bets, player.id]);

  const [rows, setRows] = useState<Row[]>([
    { key: 1, home: 1, away: 0, amount: 1000 },
  ]);
  const nextKey = useRef(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalNeeded = rows.reduce((s, r) => s + Math.max(0, Math.floor(r.amount || 0)), 0);

  function setRow(key: number, patch: Partial<Row>) {
    setError(null);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { key: nextKey.current++, home: 0, away: 0, amount: 1000 }]);
  }
  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  function resultOf(home: number, away: number) {
    if (home >= 6 || away >= 6)
      return { text: "난타전", cls: "bg-amber-500/15 text-amber-300" };
    if (home > away) return { text: "한국 승", cls: "bg-emerald-500/15 text-emerald-300" };
    if (home === away) return { text: "무승부", cls: "bg-white/10 text-pitch-50/70" };
    return { text: "한국 패", cls: "bg-red-500/15 text-red-300" };
  }

  async function handleBet() {
    const valid = rows.filter((r) => Math.floor(r.amount || 0) > 0);
    if (valid.length === 0) {
      setError("베팅 금액을 입력하세요.");
      return;
    }
    if (totalNeeded > player.chips) {
      setError(`총 ${totalNeeded.toLocaleString()}칩 필요 · 보유 ${player.chips.toLocaleString()}칩`);
      return;
    }
    for (const r of valid) {
      if (!optionFor(r.home, r.away)) {
        setError("스코어 옵션을 찾을 수 없어요.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      for (const r of valid) {
        const o = optionFor(r.home, r.away)!;
        await placeBet({ playerId: player.id, categoryId: category.id, optionId: o.id, amount: Math.floor(r.amount) });
      }
      setRows([{ key: nextKey.current++, home: 1, away: 0, amount: 1000 }]);
      onBet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "베팅에 실패했어요.");
      onBet();
    } finally {
      setBusy(false);
    }
  }

  async function cancel(optId: string) {
    setBusy(true);
    setError(null);
    try {
      await removeBet({ playerId: player.id, categoryId: category.id, optionId: optId });
      onBet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "취소에 실패했어요.");
      onBet();
    } finally {
      setBusy(false);
    }
  }

  // 내 베팅 (취소용) — 라벨 정리
  const myBets = options
    .map((o) => ({ o, mine: myByOption.get(o.id) ?? 0 }))
    .filter((x) => x.mine > 0);

  const selectCls =
    "rounded-lg border border-pitch-700/50 bg-[#06180f] px-2 py-1.5 text-sm font-mono text-pitch-50 outline-none focus:border-gold-500/60";

  return (
    <div>
      {/* 대진 (두 나라 국기) */}
      <div className="mb-3 flex items-center justify-center gap-3 rounded-xl border border-pitch-700/40 bg-[#06180f] py-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-pitch-50">
          <Flag emoji={korea?.flag_emoji ?? "🇰🇷"} code="KOR" /> 한국
        </span>
        <span className="text-xs text-pitch-50/40">VS</span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-pitch-50">
          <Flag emoji={opponent?.flag_emoji} code={opponent?.fifa_code} />
          {opponent?.name ?? "상대"}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-pitch-50/60">확정 {confirmedCount}명</span>
        <span className="text-pitch-50/50">보유 {player.chips.toLocaleString()}칩</span>
      </div>

      {iConfirmed && (
        <p className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          ✅ 내 베팅을 확정했어요. 수정하려면 “확정 해제”.
        </p>
      )}

      {!iConfirmed && (
        <>
          {/* 스코어 입력 줄들 */}
          <div className="space-y-2">
            {rows.map((r) => {
              const res = resultOf(r.home, r.away);
              return (
                <div
                  key={r.key}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-pitch-700/40 bg-[#04130c] p-2"
                >
                  <Flag emoji={korea?.flag_emoji ?? "🇰🇷"} code="KOR" />
                  <select
                    value={r.home}
                    onChange={(e) => setRow(r.key, { home: Number(e.target.value) })}
                    className={selectCls}
                    aria-label="한국 골"
                  >
                    {GOAL_CHOICES.map((g) => (
                      <option key={g} value={g}>{g === 6 ? "6+" : g}</option>
                    ))}
                  </select>

                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${res.cls}`}>
                    {res.text}
                  </span>

                  <select
                    value={r.away}
                    onChange={(e) => setRow(r.key, { away: Number(e.target.value) })}
                    className={selectCls}
                    aria-label="상대 골"
                  >
                    {GOAL_CHOICES.map((g) => (
                      <option key={g} value={g}>{g === 6 ? "6+" : g}</option>
                    ))}
                  </select>
                  <Flag emoji={opponent?.flag_emoji} code={opponent?.fifa_code} />

                  <span className="ml-auto flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={Number.isFinite(r.amount) ? r.amount : 0}
                      onChange={(e) => setRow(r.key, { amount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      className="w-20 rounded-lg border border-pitch-700/50 bg-[#06180f] px-2 py-1.5 text-right font-mono text-sm text-gold-300 outline-none focus:border-gold-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="베팅 칩"
                    />
                    <span className="text-[10px] text-pitch-50/40">칩</span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        className="ml-0.5 text-pitch-50/40 hover:text-red-400"
                        aria-label="이 줄 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-2 w-full rounded-lg border border-dashed border-pitch-600/50 py-2 text-xs font-semibold text-pitch-300 hover:border-gold-500/40 hover:text-gold-300"
          >
            + 스코어 추가
          </button>

          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

          <button
            type="button"
            onClick={handleBet}
            disabled={busy || player.chips <= 0}
            className="mt-2 w-full rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-[#1a1205] hover:bg-gold-400 disabled:opacity-50"
          >
            {busy ? "베팅 중…" : `${totalNeeded.toLocaleString()}칩 베팅하기`}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-pitch-50/40">
            확정 전까지 추가·취소(환불) 자유. 정확히 맞히면 독식, 못 맞히면 승무패 맞힌 사람끼리.
          </p>
        </>
      )}

      {/* 내 베팅 취소 */}
      {!iConfirmed && myBets.length > 0 && (
        <div className="mt-3 rounded-xl border border-pitch-700/40 bg-[#04130c] p-3">
          <p className="mb-1.5 text-[11px] text-pitch-50/60">내 베팅 (✕ 취소·환불)</p>
          <div className="flex flex-wrap gap-1.5">
            {myBets.map(({ o, mine }) => (
              <button
                key={o.id}
                type="button"
                onClick={() => cancel(o.id)}
                disabled={busy}
                className="flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-1 text-xs text-gold-200 hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
              >
                {o.label} {mine.toLocaleString()}칩 <span aria-hidden>✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {onToggleConfirm && (
        <button
          type="button"
          onClick={onToggleConfirm}
          className={[
            "mt-3 w-full rounded-lg py-2.5 text-sm font-bold",
            iConfirmed
              ? "border border-pitch-700/50 text-pitch-50/80 hover:text-pitch-50"
              : "bg-emerald-500 text-[#04121a] hover:bg-emerald-400",
          ].join(" ")}
        >
          {iConfirmed ? "내 베팅 확정 해제 (수정하기)" : "내 베팅 확정"}
        </button>
      )}
    </div>
  );
}
