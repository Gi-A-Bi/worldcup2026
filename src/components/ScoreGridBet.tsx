"use client";

import { useMemo, useState } from "react";
import { aggregateBets, placeBet, removeBet } from "@/lib/bets";
import { SCORE_MAX } from "@/lib/scores";
import type { BetWithNames, CategoryWithOptions, Option, Player } from "@/lib/types";

/**
 * 스코어 맞추기 베팅 UI.
 * 0~5 격자(한국 골 × 상대 골) + '6골 이상' 버킷. 자유 금액, 여러 스코어 베팅 가능.
 * 확정 전까지 추가/취소(환불) 자유.
 */
export default function ScoreGridBet({
  category,
  player,
  bets,
  iConfirmed,
  confirmedCount,
  onToggleConfirm,
  onBet,
}: {
  category: CategoryWithOptions;
  player: Player;
  bets: BetWithNames[];
  iConfirmed: boolean;
  confirmedCount: number;
  onToggleConfirm?: () => void;
  onBet: () => void;
}) {
  const options = useMemo(() => category.options ?? [], [category.options]);
  const agg = useMemo(() => aggregateBets(bets), [bets]);

  const cell = useMemo(() => {
    const m = new Map<string, Option>();
    let bucket: Option | undefined;
    for (const o of options) {
      if (o.home_goals === -1) bucket = o;
      else if (o.home_goals != null && o.away_goals != null)
        m.set(`${o.home_goals}_${o.away_goals}`, o);
    }
    return { m, bucket };
  }, [options]);

  const myByOption = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bets)
      if (b.player_id === player.id)
        m.set(b.option_id, (m.get(b.option_id) ?? 0) + b.amount);
    return m;
  }, [bets, player.id]);

  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = SCORE_MAX + 1;
  const perOption = Math.floor(amount || 0);
  const totalNeeded = perOption * picks.size;

  function toggle(optId: string | undefined) {
    if (!optId || iConfirmed) return;
    setError(null);
    setPicks((prev) => {
      const n = new Set(prev);
      if (n.has(optId)) n.delete(optId);
      else n.add(optId);
      return n;
    });
  }

  async function handleBet() {
    if (picks.size === 0) {
      setError("스코어를 한 칸 이상 고르세요.");
      return;
    }
    if (perOption <= 0) {
      setError("베팅 칩은 1 이상이어야 해요.");
      return;
    }
    if (totalNeeded > player.chips) {
      setError(`총 ${totalNeeded.toLocaleString()}칩 필요 · 보유 ${player.chips.toLocaleString()}칩`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const id of picks)
        await placeBet({ playerId: player.id, categoryId: category.id, optionId: id, amount: perOption });
      setPicks(new Set());
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

  function cellClass(o: Option | undefined) {
    if (!o) return "bg-[#04130c] text-pitch-50/20";
    const sel = picks.has(o.id);
    const mine = (myByOption.get(o.id) ?? 0) > 0;
    if (sel) return "bg-gold-500/25 ring-1 ring-gold-400 text-pitch-50";
    if (mine) return "bg-emerald-500/20 text-emerald-200";
    const pool = agg.byOption.get(o.id) ?? 0;
    if (pool > 0) return "bg-pitch-600/20 text-pitch-50/90";
    return "bg-[#06180f] text-pitch-50/60";
  }

  const myBetOptions = options
    .map((o) => ({ o, mine: myByOption.get(o.id) ?? 0 }))
    .filter((x) => x.mine > 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-pitch-50/60">
          내 선택 {picks.size}칸 · 확정 {confirmedCount}명
        </span>
        <span className="text-pitch-50/50">보유 {player.chips.toLocaleString()}칩</span>
      </div>

      {iConfirmed && (
        <p className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          ✅ 내 베팅을 확정했어요. 수정하려면 “확정 해제”.
        </p>
      )}

      <p className="mb-2 text-[11px] text-pitch-50/50">
        ← 상대 골 →, ↓ 한국 골. 칸을 눌러 스코어를 고르고 베팅. (예: 한국 2 : 1 상대)
      </p>

      {/* 격자 */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="text-[10px] text-pitch-50/40">한\상</th>
              {Array.from({ length: rows }, (_, a) => (
                <th key={a} className="text-[10px] font-mono text-pitch-400">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, h) => (
              <tr key={h}>
                <th className="text-[10px] font-mono text-pitch-400">{h}</th>
                {Array.from({ length: rows }, (_, a) => {
                  const o = cell.m.get(`${h}_${a}`);
                  const pool = o ? agg.byOption.get(o.id) ?? 0 : 0;
                  const mine = o ? myByOption.get(o.id) ?? 0 : 0;
                  return (
                    <td key={a} className="p-0">
                      <button
                        type="button"
                        disabled={iConfirmed || busy}
                        onClick={() => toggle(o?.id)}
                        aria-label={`한국 ${h} 상대 ${a}`}
                        className={`flex h-9 w-full flex-col items-center justify-center rounded text-[10px] leading-none transition-colors disabled:opacity-70 ${cellClass(o)}`}
                      >
                        <span className="font-mono">{h}:{a}</span>
                        {mine > 0 ? (
                          <span className="text-[8px] text-gold-300">내{mine.toLocaleString()}</span>
                        ) : pool > 0 ? (
                          <span className="text-[8px] text-pitch-50/40">{pool.toLocaleString()}</span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6골 이상 버킷 */}
      {cell.bucket && (
        <button
          type="button"
          disabled={iConfirmed || busy}
          onClick={() => toggle(cell.bucket?.id)}
          className={`mt-1 w-full rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-70 ${cellClass(cell.bucket)}`}
        >
          6골 이상 (난타전)
          {(() => {
            const pool = agg.byOption.get(cell.bucket!.id) ?? 0;
            const mine = myByOption.get(cell.bucket!.id) ?? 0;
            return mine > 0 ? (
              <span className="ml-1 text-gold-300">· 내 {mine.toLocaleString()}</span>
            ) : pool > 0 ? (
              <span className="ml-1 text-pitch-50/40">· {pool.toLocaleString()}칩</span>
            ) : null;
          })()}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {/* 베팅 바 */}
      {!iConfirmed && picks.size > 0 && (
        <div className="mt-3 rounded-xl border border-gold-500/30 bg-gold-500/5 p-3">
          <div className="flex items-center gap-2">
            <Stepper value={amount} max={player.chips} onChange={setAmount} />
            <button
              type="button"
              onClick={() => setAmount(picks.size > 0 ? Math.floor(player.chips / picks.size) : player.chips)}
              className="shrink-0 rounded-lg border border-pitch-700/50 px-2.5 py-2 text-xs text-pitch-50/70 hover:text-gold-300"
            >
              올인
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-pitch-50/50">
            {picks.size}칸 × {perOption.toLocaleString()}칩 = 합계{" "}
            <span className="font-mono text-gold-300">{totalNeeded.toLocaleString()}칩</span>
          </p>
          <button
            type="button"
            onClick={handleBet}
            disabled={busy || player.chips <= 0}
            className="mt-2 w-full rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-[#1a1205] hover:bg-gold-400 disabled:opacity-50"
          >
            {busy ? "베팅 중…" : `${totalNeeded.toLocaleString()}칩 베팅하기`}
          </button>
        </div>
      )}

      {/* 내 베팅 취소 */}
      {!iConfirmed && myBetOptions.length > 0 && (
        <div className="mt-3 rounded-xl border border-pitch-700/40 bg-[#04130c] p-3">
          <p className="mb-1.5 text-[11px] text-pitch-50/60">내 베팅 (✕ 취소·환불)</p>
          <div className="flex flex-wrap gap-1.5">
            {myBetOptions.map(({ o, mine }) => (
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

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(max, Math.floor(v || 0)));
  return (
    <div className="flex flex-1 items-center rounded-lg border border-pitch-700/50 bg-[#06180f]">
      <button type="button" onClick={() => onChange(clamp(value - 100))} className="px-3 py-2 text-pitch-50/70 hover:text-gold-300">−</button>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full min-w-0 bg-transparent text-center font-mono text-sm text-pitch-50 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => onChange(clamp(value + 100))} className="px-3 py-2 text-pitch-50/70 hover:text-gold-300">+</button>
    </div>
  );
}
