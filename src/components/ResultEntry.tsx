"use client";

import { useMemo, useState } from "react";
import { aggregateBets } from "@/lib/bets";
import { resolveCategory } from "@/lib/settlements";
import type {
  BetWithNames,
  CategoryWithOptions,
  Player,
  Team,
} from "@/lib/types";
import ConfirmModal from "@/components/ConfirmModal";
import OptionSelector from "@/components/OptionSelector";

/**
 * 경기 결과 입력 → 자동 정산.
 * 실제 결과(정답 옵션)를 고르고 확정하면 resolve_category RPC 로 칩이 분배된다.
 * (열림/마감 상태 모두에서 사용 가능 — 마감 안 했어도 결과 입력 시 정산됨)
 */
export default function ResultEntry({
  category,
  teams,
  player,
  bets,
  onResolved,
  defaultOpen = false,
}: {
  category: CategoryWithOptions;
  teams: Team[];
  player: Player;
  bets: BetWithNames[];
  onResolved: () => void;
  defaultOpen?: boolean;
}) {
  const isMulti = category.multi_select;
  const isParimutuel = category.settlement_type === "parimutuel";
  const options = category.options ?? [];
  const agg = useMemo(() => aggregateBets(bets), [bets]);

  const [open, setOpen] = useState(defaultOpen);
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(optionId: string) {
    setError(null);
    setCorrect((prev) => {
      if (isMulti) {
        const next = new Set(prev);
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
        return next;
      }
      return prev.has(optionId) ? new Set() : new Set([optionId]);
    });
  }

  async function doResolve() {
    if (correct.size === 0) {
      setError("결과를 한 개 이상 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolveCategory({
        categoryId: category.id,
        correctOptionIds: [...correct],
        playerId: player.id,
      });
      setConfirm(false);
      setCorrect(new Set());
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "정산에 실패했어요.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-[#04121a] hover:bg-sky-400"
      >
        결과 입력하고 정산하기 →
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
      <p className="text-sm font-semibold text-pitch-50">
        실제 결과 선택{" "}
        <span className="text-xs font-normal text-pitch-50/50">
          · {isMulti ? "여러 개 선택 가능" : "하나 선택"}
        </span>
      </p>
      <p className="mb-2 mt-1 text-[11px] text-pitch-50/50">
        경기 결과(정답)를 고르고 정산하면 칩이 자동으로 분배돼요.
      </p>

      {options.length === 0 ? (
        <p className="text-xs text-pitch-50/40">옵션이 없어 정산할 수 없어요.</p>
      ) : (
        <OptionSelector
          options={options}
          teams={teams}
          selected={correct}
          onToggle={toggle}
          accent="emerald"
          agg={agg}
          isParimutuel={isParimutuel}
          playerId={player.id}
        />
      )}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      <button
        type="button"
        onClick={() => {
          if (correct.size === 0) {
            setError("결과를 한 개 이상 선택하세요.");
            return;
          }
          setError(null);
          setConfirm(true);
        }}
        disabled={busy || options.length === 0}
        className="mt-3 w-full rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-[#04121a] hover:bg-sky-400 disabled:opacity-50"
      >
        {busy ? "정산 중…" : "이 결과로 정산"}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-pitch-50/40">
        정산하면 되돌릴 수 없어요.
      </p>

      <ConfirmModal
        open={confirm}
        title="결과 확정 · 정산"
        message={`'${category.name}' 결과를 확정할까요?\n결과: ${options
          .filter((o) => correct.has(o.id))
          .map((o) => o.label)
          .join(", ")}\n\n칩이 자동 분배되며 되돌릴 수 없어요.`}
        confirmText="정산하기"
        danger
        busy={busy}
        onConfirm={doResolve}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
