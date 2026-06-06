"use client";

import { useState } from "react";
import {
  addCustomOption,
  addTeamOptions,
  lockCategory,
  removeOption,
  settlementLabel,
  statusLabel,
} from "@/lib/categories";
import type { CategoryWithOptions, Team } from "@/lib/types";
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
  roomId,
  playerId,
  onChanged,
}: {
  category: CategoryWithOptions;
  teams: Team[];
  roomId: string;
  playerId: string;
  onChanged: () => void;
}) {
  const [managing, setManaging] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  const badge = statusLabel(category.status);
  const isOpen = category.status === "open";
  const options = category.options ?? [];
  const usedTeamIds = options
    .map((o) => o.team_id)
    .filter((id): id is string => !!id);

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

  async function handleAddTeam(team: Team) {
    await run(() => addTeamOptions(category.id, [team]));
  }

  async function handleRemove(optionId: string) {
    await run(() => removeOption(optionId));
  }

  async function handleLock() {
    setConfirmLock(false);
    await run(() => lockCategory(category, roomId, playerId));
  }

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
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
        >
          {badge.text}
        </span>
      </div>

      {/* 옵션 목록 */}
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <li
            key={o.id}
            className="flex items-center gap-1 rounded-full border border-pitch-700/40 bg-[#06180f] px-2.5 py-1 text-xs text-pitch-50/80"
          >
            <span>{o.label}</span>
            {managing && isOpen && (
              <button
                type="button"
                onClick={() => handleRemove(o.id)}
                disabled={busy}
                className="ml-0.5 text-pitch-50/40 hover:text-red-400"
                aria-label="옵션 삭제"
              >
                ×
              </button>
            )}
          </li>
        ))}
        {options.length === 0 && (
          <li className="text-xs text-pitch-50/40">옵션이 아직 없어요.</li>
        )}
      </ul>

      {error && (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {error}
        </p>
      )}

      {/* 액션 */}
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
          {/* 직접 옵션 추가 */}
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

          {/* 팀 옵션 추가 */}
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
                  onToggle={(t) => void handleAddTeam(t)}
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
