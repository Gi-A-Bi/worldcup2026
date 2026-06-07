"use client";

import { useMemo, useState } from "react";
import { aggregateBets, placeBet, removeBet } from "@/lib/bets";
import type { BetWithNames, CategoryWithOptions, Player } from "@/lib/types";
import OptionSelector from "@/components/OptionSelector";

const STAKE = 1000; // 팀당 고정 칩
const PICKS = 32; // 정확히 32팀

/**
 * 진출팀(희소성 분배) 베팅 UI.
 * - 팀당 1,000칩 고정, 정확히 32팀 선택
 * - 확정 전까지 팀을 누르면 바로 추가/취소(환불) — 수정 가능
 * - 32팀을 맞춘 뒤 '내 베팅 확정'
 */
export default function RarityAdvanceBet({
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
  teams: import("@/lib/types").Team[];
  player: Player;
  bets: BetWithNames[];
  iConfirmed: boolean;
  confirmedCount: number;
  onToggleConfirm?: () => void;
  onBet: () => void;
}) {
  const options = category.options ?? [];
  const agg = useMemo(() => aggregateBets(bets), [bets]);
  const mySet = useMemo(
    () =>
      new Set(
        bets.filter((b) => b.player_id === player.id).map((b) => b.option_id)
      ),
    [bets, player.id]
  );
  const count = mySet.size;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(optionId: string) {
    if (iConfirmed || busy) return;
    setError(null);
    const picked = mySet.has(optionId);
    if (!picked && count >= PICKS) {
      setError(`${PICKS}팀까지만 고를 수 있어요. 바꾸려면 먼저 해제하세요.`);
      return;
    }
    setBusy(true);
    try {
      if (picked) {
        await removeBet({
          playerId: player.id,
          categoryId: category.id,
          optionId,
        });
      } else {
        await placeBet({
          playerId: player.id,
          categoryId: category.id,
          optionId,
          amount: STAKE,
        });
      }
      onBet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 rounded-lg bg-pitch-600/10 px-3 py-2 text-xs leading-relaxed text-pitch-50/70">
        🎯 진출할 <b className="text-pitch-50">{PICKS}팀</b>을 고르세요 (팀당{" "}
        {STAKE.toLocaleString()}칩 고정). 정산 때 전체 칩을 진출팀 수로 나눠, 각
        팀 몫을 <b className="text-pitch-50">그 팀 고른 사람끼리</b> 나눠 가져요.
        <b className="text-gold-300"> 남이 적게 고른 진출팀일수록 더 큰 이익!</b>{" "}
        확정 전까지 자유롭게 바꿀 수 있어요.
      </p>

      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-pitch-50/60">
          내 선택{" "}
          <b
            className={count === PICKS ? "text-gold-300" : "text-pitch-50"}
          >
            {count}/{PICKS}
          </b>{" "}
          · 확정 {confirmedCount}명
        </span>
        <span className="text-pitch-50/50">
          보유 {player.chips.toLocaleString()}칩
        </span>
      </div>

      {iConfirmed && (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          ✅ 내 베팅을 확정했어요. 수정하려면 “확정 해제”를 누르세요.
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-xs text-pitch-50/40">옵션이 없어요.</p>
      ) : (
        <OptionSelector
          options={options}
          teams={teams}
          selected={mySet}
          onToggle={toggle}
          accent="gold"
          agg={agg}
          isParimutuel={false}
          playerId={player.id}
          disabled={iConfirmed || busy}
        />
      )}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {onToggleConfirm && (
        <button
          type="button"
          onClick={onToggleConfirm}
          disabled={!iConfirmed && count !== PICKS}
          className={[
            "mt-3 w-full rounded-lg py-2.5 text-sm font-bold disabled:opacity-50",
            iConfirmed
              ? "border border-pitch-700/50 text-pitch-50/80 hover:text-pitch-50"
              : "bg-emerald-500 text-[#04121a] hover:bg-emerald-400",
          ].join(" ")}
        >
          {iConfirmed
            ? "내 베팅 확정 해제 (수정하기)"
            : count === PICKS
              ? "내 베팅 확정"
              : `${PICKS}팀을 채우면 확정할 수 있어요 (${count}/${PICKS})`}
        </button>
      )}
    </div>
  );
}
