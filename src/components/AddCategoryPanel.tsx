"use client";

import { useState } from "react";
import {
  CATEGORY_TEMPLATES,
  TOPSCORER_CANDIDATES,
  createCategory,
  settlementLabel,
  type CategoryTemplate,
  type NewOption,
} from "@/lib/categories";
import { teamOptionLabel } from "@/lib/flags";
import { KOREA_NAME, createKoreaMatch, koreaOpponents } from "@/lib/scores";
import type { Team } from "@/lib/types";
import TeamMultiPicker from "@/components/TeamMultiPicker";

export default function AddCategoryPanel({
  teams,
  roomId,
  playerId,
  existingNames = [],
  onCreated,
}: {
  teams: Team[];
  roomId: string;
  playerId: string;
  existingNames?: string[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<CategoryTemplate | null>(null);

  // 공통 입력
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // match 전용
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [kickoff, setKickoff] = useState("");

  // pick-teams 전용
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function reset() {
    setTpl(null);
    setName("");
    setHomeId("");
    setAwayId("");
    setKickoff("");
    setPicked(new Set());
    setError(null);
    setBusy(false);
  }

  function chooseTemplate(t: CategoryTemplate) {
    reset();
    setTpl(t);
    setName(t.name);
  }

  async function submit() {
    if (!tpl) return;
    setError(null);

    let options: NewOption[] = [];
    let kickoffAt: string | null = null;

    try {
      if (tpl.optionStrategy === "all-teams") {
        options = teams.map((t) => ({
          label: teamOptionLabel(t),
          team_id: t.id,
        }));
      } else if (tpl.optionStrategy === "pick-teams") {
        const chosen = teams.filter((t) => picked.has(t.id));
        if (chosen.length < 2)
          throw new Error("팀을 2개 이상 선택해주세요.");
        options = chosen.map((t) => ({
          label: teamOptionLabel(t),
          team_id: t.id,
        }));
      } else if (tpl.optionStrategy === "match") {
        if (!homeId || !awayId) throw new Error("두 팀을 모두 골라주세요.");
        if (homeId === awayId)
          throw new Error("서로 다른 두 팀을 골라주세요.");
        const home = teams.find((t) => t.id === homeId)!;
        const away = teams.find((t) => t.id === awayId)!;
        options = [
          { label: `${teamOptionLabel(home)} 승`, team_id: home.id },
          { label: "무승부", team_id: null },
          { label: `${teamOptionLabel(away)} 승`, team_id: away.id },
        ];
        kickoffAt = kickoff ? new Date(kickoff).toISOString() : null;
      } else if (tpl.type === "topscorer") {
        // 득점왕: 유력 후보 10명 기본 제공 (카드에서 추가/삭제 가능)
        options = TOPSCORER_CANDIDATES.map((label) => ({ label }));
      }
      // 그 외 manual: 옵션 없음 (생성 후 카드에서 직접 추가)

      setBusy(true);
      await createCategory({
        roomId,
        playerId,
        name,
        type: tpl.type,
        settlementType: tpl.settlementType,
        multiSelect: tpl.multiSelect,
        kickoffAt,
        options,
      });
      reset();
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "카테고리 생성에 실패했어요.");
      setBusy(false);
    }
  }

  const existing = new Set(existingNames);
  const opponents = koreaOpponents(teams);

  async function createKorea(opps: Team[], kickoffAt: string | null) {
    setError(null);
    const targets = opps.filter(
      (o) => !existing.has(`🇰🇷 한국 vs ${o.name}`)
    );
    if (targets.length === 0) {
      setError("이미 추가된 경기예요.");
      return;
    }
    setBusy(true);
    try {
      for (const opp of targets) {
        await createKoreaMatch({ roomId, playerId, opponent: opp, kickoffAt });
      }
      reset();
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "경기 생성에 실패했어요.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-pitch-600/50 bg-pitch-600/10 py-3 text-sm font-semibold text-pitch-300 hover:border-gold-500/40 hover:text-gold-300"
      >
        + 카테고리 추가
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-pitch-700/50 bg-pitch-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-pitch-50">카테고리 추가</h3>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs text-pitch-50/50 hover:text-pitch-50"
        >
          닫기
        </button>
      </div>

      {/* 템플릿 선택 */}
      {!tpl && (
        <div className="space-y-2">
          {CATEGORY_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => chooseTemplate(t)}
              className="block w-full rounded-lg border border-pitch-700/40 bg-[#06180f] p-3 text-left hover:border-gold-500/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-pitch-50">
                  {t.name}
                </span>
                <span className="text-[10px] text-pitch-400">
                  {settlementLabel(t.settlementType)}
                  {t.multiSelect ? " · 복수선택" : ""}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-pitch-50/50">{t.description}</p>
              <p className="mt-1 text-[10px] text-pitch-50/40">
                정산: {t.settleWhen}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* 선택된 템플릿 폼 */}
      {tpl && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTpl(null)}
            className="text-xs text-pitch-400 hover:text-gold-300"
          >
            ← 템플릿 다시 고르기
          </button>

          {tpl.optionStrategy === "korea" && (
            <div className="space-y-3">
              <p className="rounded-lg bg-pitch-600/10 px-3 py-2 text-xs leading-relaxed text-pitch-50/70">
                한국 경기 스코어 맞추기예요. 정확한 스코어를 맞히면 독식, 못
                맞히면 승무패 맞힌 사람끼리 나눠 가져요.
              </p>

              <div>
                <p className="mb-1 text-xs font-medium text-pitch-50/70">
                  조별리그 (자동)
                </p>
                {opponents.length === 0 ? (
                  <p className="text-xs text-pitch-50/40">
                    한국 팀 데이터를 찾을 수 없어요.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-[11px] text-pitch-50/50">
                      상대: {opponents.map((o) => o.name).join(", ")}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => createKorea(opponents, null)}
                      className="w-full rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-[#1a1205] hover:bg-gold-400 disabled:opacity-50"
                    >
                      {busy
                        ? "만드는 중…"
                        : `조별 ${opponents.length}경기 한 번에 추가`}
                    </button>
                  </>
                )}
              </div>

              <div className="border-t border-pitch-700/30 pt-3">
                <p className="mb-1 text-xs font-medium text-pitch-50/70">
                  토너먼트 등 직접 추가
                </p>
                <TeamSelect
                  label="상대팀"
                  teams={teams.filter((t) => t.name !== KOREA_NAME)}
                  value={awayId}
                  onChange={setAwayId}
                />
                <label className="mt-2 block">
                  <span className="mb-1 block text-xs font-medium text-pitch-50/70">
                    킥오프 (KST, 선택)
                  </span>
                  <input
                    type="datetime-local"
                    value={kickoff}
                    onChange={(e) => setKickoff(e.target.value)}
                    className="w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-2 text-sm text-pitch-50 outline-none focus:border-gold-500/60"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !awayId}
                  onClick={() => {
                    const opp = teams.find((t) => t.id === awayId);
                    if (opp)
                      createKorea(
                        [opp],
                        kickoff ? new Date(kickoff).toISOString() : null
                      );
                  }}
                  className="mt-2 w-full rounded-lg border border-pitch-600/50 bg-pitch-600/10 py-2.5 text-sm font-semibold text-pitch-200 hover:text-gold-300 disabled:opacity-50"
                >
                  이 경기 추가
                </button>
              </div>

              {error && <p className="text-xs text-red-300">{error}</p>}
            </div>
          )}

          {tpl.optionStrategy !== "korea" && (
            <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-pitch-50/70">
              카테고리 이름
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder={
                tpl.type === "knockout" ? "예: 16강 승리팀" : tpl.name
              }
              className="w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-2 text-sm text-pitch-50 outline-none focus:border-gold-500/60"
            />
          </label>

          {tpl.optionStrategy === "all-teams" && (
            <p className="rounded-lg bg-pitch-600/10 px-3 py-2 text-xs text-pitch-50/60">
              {teams.length}개 팀이 옵션으로 자동 생성돼요.
            </p>
          )}

          {tpl.optionStrategy === "manual" && (
            <p className="rounded-lg bg-pitch-600/10 px-3 py-2 text-xs text-pitch-50/60">
              {tpl.type === "topscorer"
                ? "유력 후보 10명이 기본으로 들어가요. 만든 뒤 카드에서 더 추가/삭제할 수 있어요."
                : "만든 뒤 카드에서 옵션(선수명 등)을 직접 추가하세요."}
            </p>
          )}

          {tpl.optionStrategy === "match" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <TeamSelect
                  label="홈팀"
                  teams={teams}
                  value={homeId}
                  onChange={setHomeId}
                />
                <TeamSelect
                  label="원정팀"
                  teams={teams}
                  value={awayId}
                  onChange={setAwayId}
                />
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-pitch-50/70">
                  킥오프 (한국시간, 선택)
                </span>
                <input
                  type="datetime-local"
                  value={kickoff}
                  onChange={(e) => setKickoff(e.target.value)}
                  className="w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-2 text-sm text-pitch-50 outline-none focus:border-gold-500/60"
                />
              </label>
              <p className="text-[11px] text-pitch-50/40">
                옵션은 자동으로 “홈팀 승 / 무승부 / 원정팀 승”이 생성돼요.
              </p>
            </div>
          )}

          {tpl.optionStrategy === "pick-teams" && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-pitch-50/70">
                옵션으로 넣을 팀 선택{" "}
                <span className="text-pitch-400">({picked.size})</span>
              </p>
              <TeamMultiPicker
                teams={teams}
                selectedIds={picked}
                onToggle={(t) =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    return next;
                  })
                }
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-[#1a1205] hover:bg-gold-400 disabled:opacity-50"
          >
            {busy ? "만드는 중…" : "카테고리 만들기"}
          </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: Team[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-pitch-50/70">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-2 py-2 text-sm text-pitch-50 outline-none focus:border-gold-500/60"
      >
        <option value="">선택…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.group_label} · {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
