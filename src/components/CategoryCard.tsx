"use client";

import { useMemo, useState } from "react";
import {
  addCustomOption,
  addTeamOptions,
  lockCategory,
  removeOption,
  settlementLabel,
  statusLabel,
} from "@/lib/categories";
import { aggregateBets, placeBet } from "@/lib/bets";
import type {
  BetWithNames,
  CategoryWithOptions,
  Player,
  Team,
} from "@/lib/types";
import ConfirmModal from "@/components/ConfirmModal";
import OptionSelector from "@/components/OptionSelector";
import ResultEntry from "@/components/ResultEntry";
import TeamMultiPicker from "@/components/TeamMultiPicker";

const SETTLE_WHEN: Record<string, string> = {
  winner: "대회 종료 후",
  advance: "조별리그 종료 후",
  topscorer: "대회 종료 후",
  match: "매치 종료 즉시",
  knockout: "라운드 종료 후",
};

function helpText(isParimutuel: boolean): string {
  return isParimutuel
    ? "🎯 한 곳에 칩을 거세요. 정답을 맞힌 사람들끼리 전체 칩을 나눠 가져요. 적게 몰린 곳일수록 배당률(받는 배수 ×)이 높아요. 배수는 지금 베팅 기준이라 마감까지 바뀔 수 있어요."
    : "🎯 진출할 팀을 여러 개 골라 칩을 거세요. 맞힌 팀에 건 칩 비율만큼 전체 칩을 나눠 가져요. 더 많이·정확히 맞힐수록 유리해요.";
}

function formatKST(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function CategoryCard({
  category,
  teams,
  player,
  bets,
  roomId,
  defaultOpen = false,
  onChanged,
  onBet,
}: {
  category: CategoryWithOptions;
  teams: Team[];
  player: Player;
  bets: BetWithNames[];
  roomId: string;
  defaultOpen?: boolean;
  onChanged: () => void;
  onBet: () => void;
}) {
  const playerId = player.id;
  const [expanded, setExpanded] = useState(defaultOpen);

  // 옵션 관리
  const [managing, setManaging] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  // 베팅
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState(1000);
  const [betError, setBetError] = useState<string | null>(null);
  const [betting, setBetting] = useState(false);

  const badge = statusLabel(category.status);
  const isOpen = category.status === "open";
  const isLocked = category.status === "locked";
  const isResolved = category.status === "resolved";
  const isParimutuel = category.settlement_type === "parimutuel";
  const isMulti = category.multi_select;
  const options = useMemo(() => category.options ?? [], [category.options]);
  const usedTeamIds = options
    .map((o) => o.team_id)
    .filter((id): id is string => !!id);
  const agg = useMemo(() => aggregateBets(bets), [bets]);
  const correctOpts = options.filter((o) => o.is_correct);
  const myTotal = bets
    .filter((b) => b.player_id === playerId)
    .reduce((s, b) => s + b.amount, 0);

  function togglePick(optionId: string) {
    setBetError(null);
    setPicks((prev) => {
      if (isMulti) {
        const next = new Set(prev);
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
        return next;
      }
      return prev.has(optionId) ? new Set() : new Set([optionId]);
    });
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCustom() {
    if (!customLabel.trim()) return;
    await run(async () => {
      await addCustomOption(category.id, customLabel);
      setCustomLabel("");
    });
  }

  async function handleLock() {
    setConfirmLock(false);
    await run(() => lockCategory(category, roomId, playerId));
  }

  const pickCount = picks.size;
  const perOption = Math.floor(amount || 0);
  const totalNeeded = perOption * pickCount;

  async function handleBet() {
    const ids = [...picks];
    if (ids.length === 0) {
      setBetError("베팅할 항목을 선택하세요.");
      return;
    }
    if (perOption <= 0) {
      setBetError("베팅 칩은 1 이상이어야 해요.");
      return;
    }
    if (totalNeeded > player.chips) {
      setBetError(
        `총 ${totalNeeded.toLocaleString()}칩이 필요해요. 보유 ${player.chips.toLocaleString()}칩.`
      );
      return;
    }
    setBetting(true);
    setBetError(null);
    try {
      for (const id of ids) {
        await placeBet({
          playerId,
          categoryId: category.id,
          optionId: id,
          amount: perOption,
        });
      }
      setPicks(new Set());
      onBet();
    } catch (e) {
      setBetError(e instanceof Error ? e.message : "베팅에 실패했어요.");
      onBet();
    } finally {
      setBetting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-pitch-700/40 bg-pitch-900/30">
      {/* 헤더 (목록 행 — 클릭하면 펼침) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-bold text-pitch-50">
              {category.name}
            </span>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
            >
              {badge.text}
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-pitch-50/50">
            {settlementLabel(category.settlement_type)}
            {isMulti ? " · 복수선택" : ""} · 옵션 {options.length} · 풀{" "}
            {agg.total.toLocaleString()}칩
            {myTotal > 0 ? ` · 내 베팅 ${myTotal.toLocaleString()}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-pitch-50/40" aria-hidden>
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-pitch-700/30 px-4 py-3">
          {category.kickoff_at && (
            <p className="mb-2 text-xs text-gold-300/80">
              ⏱ {formatKST(category.kickoff_at)} (KST) 킥오프
            </p>
          )}

          {/* 정산 시점 안내 */}
          <p className="mb-2 text-[11px] text-pitch-50/40">
            정산 시점: {SETTLE_WHEN[category.type] ?? "수동"}
          </p>

          {/* ===== 열림: 베팅 ===== */}
          {isOpen && (
            <>
              <p className="mb-3 rounded-lg bg-pitch-600/10 px-3 py-2 text-xs leading-relaxed text-pitch-50/70">
                {helpText(isParimutuel)}
              </p>

              {options.length === 0 ? (
                <p className="text-xs text-pitch-50/40">
                  옵션이 아직 없어요. 아래 “옵션 관리”에서 추가하세요.
                </p>
              ) : (
                <OptionSelector
                  options={options}
                  teams={teams}
                  selected={picks}
                  onToggle={togglePick}
                  accent="gold"
                  agg={agg}
                  isParimutuel={isParimutuel}
                  playerId={playerId}
                />
              )}

              {/* 베팅 바 */}
              {pickCount > 0 && (
                <div className="mt-3 rounded-xl border border-gold-500/30 bg-gold-500/5 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-pitch-50">
                      {isMulti
                        ? `${pickCount}개 선택 · 각 칩 베팅`
                        : "베팅 칩"}
                    </span>
                    <span className="text-pitch-50/50">
                      보유 {player.chips.toLocaleString()}칩
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stepper
                      value={amount}
                      max={player.chips}
                      onChange={setAmount}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAmount(
                          isMulti && pickCount > 0
                            ? Math.floor(player.chips / pickCount)
                            : player.chips
                        )
                      }
                      className="shrink-0 rounded-lg border border-pitch-700/50 px-2.5 py-2 text-xs text-pitch-50/70 hover:text-gold-300"
                    >
                      올인
                    </button>
                  </div>
                  {isMulti && (
                    <p className="mt-1.5 text-[11px] text-pitch-50/50">
                      {pickCount}팀 × {perOption.toLocaleString()}칩 = 합계{" "}
                      <span className="font-mono text-gold-300">
                        {totalNeeded.toLocaleString()}칩
                      </span>
                    </p>
                  )}
                  {betError && (
                    <p className="mt-2 text-xs text-red-300">{betError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleBet}
                    disabled={betting || player.chips <= 0}
                    className="mt-2 w-full rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-[#1a1205] hover:bg-gold-400 disabled:opacity-50"
                  >
                    {betting
                      ? "베팅 중…"
                      : `${totalNeeded.toLocaleString()}칩 베팅하기`}
                  </button>
                  <p className="mt-1.5 text-center text-[11px] text-pitch-50/40">
                    베팅은 취소할 수 없어요. 마감 전까지 추가 베팅 가능.
                  </p>
                </div>
              )}

              {/* 옵션 관리 */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManaging((v) => !v)}
                  className="rounded-lg border border-pitch-700/50 px-3 py-1.5 text-xs font-medium text-pitch-50/70 hover:text-pitch-50"
                >
                  {managing ? "옵션 관리 닫기" : "옵션 관리"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLock(true)}
                  disabled={busy}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                  title="모든 참가자의 베팅을 마감합니다 (전체 적용)"
                >
                  전체 마감하기
                </button>
              </div>

              {error && (
                <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
                  {error}
                </p>
              )}

              {managing && (
                <div className="mt-3 space-y-3 rounded-xl border border-pitch-700/40 bg-[#04130c] p-3">
                  <div className="flex gap-2">
                    <input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="옵션 직접 추가 (예: 음바페)"
                      maxLength={40}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddCustom();
                        }
                      }}
                      className="flex-1 rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-2 text-sm text-pitch-50 outline-none focus:border-gold-500/60"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      disabled={busy || !customLabel.trim()}
                      className="rounded-lg bg-pitch-600 px-3 py-2 text-xs font-semibold text-white hover:bg-pitch-500 disabled:opacity-50"
                    >
                      추가
                    </button>
                  </div>
                  {/* 삭제용 옵션 칩 */}
                  {options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((o) => (
                        <span
                          key={o.id}
                          className="flex items-center gap-1 rounded-full border border-pitch-700/40 bg-[#06180f] px-2.5 py-1 text-xs text-pitch-50/80"
                        >
                          {o.label}
                          <button
                            type="button"
                            onClick={() => void run(() => removeOption(o.id))}
                            disabled={busy}
                            className="ml-0.5 text-pitch-50/40 hover:text-red-400"
                            aria-label="옵션 삭제"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowTeamPicker((v) => !v)}
                      className="text-xs text-pitch-400 hover:text-gold-300"
                    >
                      {showTeamPicker ? "팀 추가 닫기" : "+ 팀 옵션 추가"}
                    </button>
                    {showTeamPicker && (
                      <div className="mt-2">
                        <TeamMultiPicker
                          teams={teams}
                          selectedIds={new Set()}
                          disabledIds={usedTeamIds}
                          onToggle={(t) =>
                            void run(() => addTeamOptions(category.id, [t]))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== 마감: 결과 입력 → 자동 정산 ===== */}
          {isLocked && (
            <ResultEntry
              category={category}
              teams={teams}
              player={player}
              bets={bets}
              defaultOpen
              onResolved={() => {
                onChanged();
                onBet();
              }}
            />
          )}

          {/* ===== 정산됨: 결과 요약 ===== */}
          {isResolved && (
            <div>
              <p className="mb-2 text-xs text-emerald-300/80">✓ 정산 완료</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-pitch-50/50">정답:</span>
                {correctOpts.length === 0 ? (
                  <span className="text-xs text-pitch-50/40">없음(환불)</span>
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
              <p className="mt-2 text-[11px] text-pitch-50/40">
                자세한 결과는 “정산 내역” 탭에서 볼 수 있어요.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmLock}
        title="카테고리 마감 (전체 적용)"
        message={`'${category.name}'을(를) 마감할까요?\n마감하면 나뿐 아니라 모든 참가자가 이 게임에 더 이상 베팅할 수 없어요.\n(전체 적용 · 되돌릴 수 없음)`}
        confirmText="마감하기"
        danger
        busy={busy}
        onConfirm={handleLock}
        onCancel={() => setConfirmLock(false)}
      />
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
      <button
        type="button"
        onClick={() => onChange(clamp(value - 100))}
        className="px-3 py-2 text-pitch-50/70 hover:text-gold-300"
        aria-label="100 감소"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full min-w-0 bg-transparent text-center font-mono text-sm text-pitch-50 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 100))}
        className="px-3 py-2 text-pitch-50/70 hover:text-gold-300"
        aria-label="100 증가"
      >
        +
      </button>
    </div>
  );
}
