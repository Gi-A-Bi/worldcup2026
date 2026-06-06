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
import TeamMultiPicker from "@/components/TeamMultiPicker";

const SETTLE_WHEN: Record<string, string> = {
  winner: "대회 종료 후",
  advance: "조별리그 종료 후",
  topscorer: "대회 종료 후",
  match: "매치 종료 즉시",
  knockout: "라운드 종료 후",
};

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
  onChanged,
  onBet,
}: {
  category: CategoryWithOptions;
  teams: Team[];
  player: Player;
  bets: BetWithNames[];
  roomId: string;
  onChanged: () => void;
  onBet: () => void;
}) {
  const playerId = player.id;
  const [managing, setManaging] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [filter, setFilter] = useState("");

  // 베팅 패널 상태
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);
  const [betError, setBetError] = useState<string | null>(null);
  const [betting, setBetting] = useState(false);

  const badge = statusLabel(category.status);
  const isOpen = category.status === "open";
  const isParimutuel = category.settlement_type === "parimutuel";
  const options = useMemo(() => category.options ?? [], [category.options]);
  const usedTeamIds = options
    .map((o) => o.team_id)
    .filter((id): id is string => !!id);

  const agg = useMemo(() => aggregateBets(bets), [bets]);

  const visibleOptions = useMemo(() => {
    if (!filter.trim()) return options;
    const q = filter.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, filter]);

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

  async function handleBet() {
    if (!selectedOptionId) return;
    const amt = Math.floor(amount);
    if (!amt || amt <= 0) {
      setBetError("베팅 칩은 1 이상이어야 해요.");
      return;
    }
    if (amt > player.chips) {
      setBetError("보유 칩을 초과할 수 없어요.");
      return;
    }
    setBetting(true);
    setBetError(null);
    try {
      await placeBet({
        playerId,
        categoryId: category.id,
        optionId: selectedOptionId,
        amount: amt,
      });
      onBet();
    } catch (e) {
      setBetError(e instanceof Error ? e.message : "베팅에 실패했어요.");
    } finally {
      setBetting(false);
    }
  }

  function optionStat(optionId: string) {
    const pool = agg.byOption.get(optionId) ?? 0;
    const sharePct = agg.total > 0 ? (pool / agg.total) * 100 : 0;
    const odds = pool > 0 ? agg.total / pool : 0;
    const mine = agg.byPlayerOption.get(`${playerId}:${optionId}`) ?? 0;
    return { pool, sharePct, odds, mine };
  }

  const selectedOption = options.find((o) => o.id === selectedOptionId) ?? null;

  return (
    <div className="rounded-2xl border border-pitch-700/40 bg-pitch-900/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-pitch-50">
            {category.name}
          </h3>
          <p className="mt-0.5 text-xs text-pitch-50/50">
            {settlementLabel(category.settlement_type)}
            {category.multi_select ? " · 복수선택" : ""} · 정산{" "}
            {SETTLE_WHEN[category.type] ?? "수동"}
          </p>
          {category.kickoff_at && (
            <p className="mt-0.5 text-xs text-gold-300/80">
              ⏱ {formatKST(category.kickoff_at)} (KST)
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
          >
            {badge.text}
          </span>
          <span className="font-mono text-[11px] text-pitch-50/50">
            풀 {agg.total.toLocaleString()}칩
          </span>
        </div>
      </div>

      {/* 옵션 검색 (옵션 많을 때) */}
      {options.length > 12 && (
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="옵션 검색…"
          className="mt-3 w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-1.5 text-sm text-pitch-50 outline-none focus:border-gold-500/60"
        />
      )}

      {/* 옵션 목록: 풀/배당/분포 + 선택 */}
      <ul className="mt-3 space-y-1.5">
        {visibleOptions.map((o) => {
          const { pool, sharePct, odds, mine } = optionStat(o.id);
          const selected = o.id === selectedOptionId;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={!isOpen}
                onClick={() =>
                  setSelectedOptionId((prev) => (prev === o.id ? null : o.id))
                }
                className={[
                  "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-gold-500/60 bg-gold-500/10"
                    : "border-pitch-700/40 bg-[#06180f]",
                  isOpen ? "hover:border-gold-500/40" : "cursor-default",
                ].join(" ")}
              >
                {/* 분포 막대 */}
                <span
                  className="absolute inset-y-0 left-0 bg-pitch-600/20"
                  style={{ width: `${sharePct}%` }}
                  aria-hidden
                />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm text-pitch-50">
                      {o.label}
                    </span>
                    {mine > 0 && (
                      <span className="shrink-0 rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[10px] text-gold-300">
                        내 {mine.toLocaleString()}
                      </span>
                    )}
                    {managing && isOpen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void run(() => removeOption(o.id));
                        }}
                        disabled={busy}
                        className="shrink-0 text-pitch-50/40 hover:text-red-400"
                        aria-label="옵션 삭제"
                      >
                        ×
                      </button>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-xs text-pitch-50/70">
                      {pool.toLocaleString()}칩
                    </span>
                    <span className="block font-mono text-[11px] text-gold-300">
                      {isParimutuel
                        ? pool > 0
                          ? `${odds.toFixed(2)}×`
                          : "–"
                        : `${sharePct.toFixed(0)}%`}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {options.length === 0 && (
          <li className="text-xs text-pitch-50/40">옵션이 아직 없어요.</li>
        )}
      </ul>

      {/* 베팅 패널 */}
      {isOpen && selectedOption && (
        <div className="mt-3 rounded-xl border border-gold-500/30 bg-gold-500/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-pitch-50">
              {selectedOption.label}에 베팅
            </p>
            <p className="text-[11px] text-pitch-50/50">
              보유 {player.chips.toLocaleString()}칩
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Stepper
              value={amount}
              max={player.chips}
              onChange={setAmount}
            />
            <button
              type="button"
              onClick={() => setAmount(player.chips)}
              className="shrink-0 rounded-lg border border-pitch-700/50 px-2.5 py-2 text-xs text-pitch-50/70 hover:text-gold-300"
            >
              올인
            </button>
          </div>

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
              : player.chips <= 0
                ? "보유 칩 없음"
                : `${Math.floor(amount || 0).toLocaleString()}칩 베팅하기`}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-pitch-50/40">
            베팅은 취소할 수 없어요. 마감 전까지 추가 베팅 가능.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {error}
        </p>
      )}

      {/* 관리 액션 */}
      {isOpen && (
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
          >
            마감하기
          </button>
        </div>
      )}

      {!isOpen && (
        <p className="mt-3 text-xs text-pitch-50/40">
          {category.status === "locked"
            ? "마감됨 — 더 이상 베팅할 수 없어요. (정산은 Stage 5)"
            : "정산 완료된 카테고리예요."}
        </p>
      )}

      {/* 옵션 관리 패널 */}
      {managing && isOpen && (
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
                  onToggle={(t) => void run(() => addTeamOptions(category.id, [t]))}
                />
                <p className="mt-1 text-[11px] text-pitch-50/40">
                  팀을 누르면 바로 옵션으로 추가돼요. (이미 추가된 팀은 비활성)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmLock}
        title="카테고리 마감"
        message={`'${category.name}' 카테고리를 마감할까요?\n마감하면 더 이상 베팅/옵션 변경을 할 수 없어요. (되돌릴 수 없음)`}
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
