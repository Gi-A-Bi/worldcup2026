"use client";

import { useState } from "react";
import { resolveScore } from "@/lib/scores";
import type { CategoryWithOptions, Player } from "@/lib/types";
import ConfirmModal from "@/components/ConfirmModal";

/** 스코어 경기 결과 입력 → resolve_score (2단 정산) */
export default function ScoreResultEntry({
  category,
  player,
  onResolved,
}: {
  category: CategoryWithOptions;
  player: Player;
  onResolved: () => void;
}) {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result =
    home > away ? "한국 승" : home === away ? "무승부" : "상대 승";

  async function doResolve() {
    setBusy(true);
    setError(null);
    try {
      await resolveScore({
        categoryId: category.id,
        home,
        away,
        playerId: player.id,
      });
      setConfirm(false);
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "정산에 실패했어요.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
      <p className="text-sm font-semibold text-pitch-50">실제 스코어 입력</p>
      <p className="mb-3 mt-1 text-[11px] text-pitch-50/50">
        정확한 스코어 맞힌 사람이 다 가져가고, 없으면 승무패 맞힌 사람이 나눠
        가져요.
      </p>

      <div className="flex items-center justify-center gap-3">
        <Counter label="🇰🇷 한국" value={home} onChange={setHome} />
        <span className="text-lg font-bold text-pitch-50/60">:</span>
        <Counter label="상대" value={away} onChange={setAway} />
      </div>
      <p className="mt-2 text-center text-xs text-pitch-50/60">
        결과: <b className="text-gold-300">{result}</b>
      </p>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-[#04121a] hover:bg-sky-400 disabled:opacity-50"
      >
        {busy ? "정산 중…" : "이 스코어로 정산"}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-pitch-50/40">
        정산하면 되돌릴 수 없어요.
      </p>

      <ConfirmModal
        open={confirm}
        title="스코어 확정 · 정산"
        message={`실제 스코어 한국 ${home} : ${away} 상대 (${result}) 로 정산할까요?\n칩이 자동 분배되며 되돌릴 수 없어요.`}
        confirmText="정산하기"
        danger
        busy={busy}
        onConfirm={doResolve}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(20, v));
  return (
    <div className="text-center">
      <p className="mb-1 text-[11px] text-pitch-50/60">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="h-9 w-9 rounded-lg border border-pitch-700/50 text-pitch-50/70 hover:text-gold-300"
        >
          −
        </button>
        <span className="w-8 text-center font-mono text-2xl font-bold text-pitch-50">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="h-9 w-9 rounded-lg border border-pitch-700/50 text-pitch-50/70 hover:text-gold-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
