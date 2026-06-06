"use client";

import { WORLD_CUP_GROUPS } from "@/lib/worldcupTeams";
import type { BetAggregate } from "@/lib/bets";
import type { Option, Team } from "@/lib/types";

/**
 * 옵션 선택기. 팀 기반(모든 옵션에 team_id)이면 조별(A~L)로 묶어 보여주고,
 * 그 외(승/무/패·선수명 등)는 평평한 목록으로 보여준다.
 * 베팅(accent=gold)과 정산 정답선택(accent=emerald) 양쪽에서 재사용.
 */
export default function OptionSelector({
  options,
  teams,
  selected,
  onToggle,
  accent = "gold",
  agg,
  isParimutuel = false,
  playerId,
  disabled = false,
}: {
  options: Option[];
  teams: Team[];
  selected: Set<string>;
  onToggle: (optionId: string) => void;
  accent?: "gold" | "emerald";
  agg?: BetAggregate;
  isParimutuel?: boolean;
  playerId?: string;
  disabled?: boolean;
}) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const grouped = options.length > 0 && options.every((o) => o.team_id);

  const onCls =
    accent === "emerald"
      ? "border-emerald-500/60 bg-emerald-500/15"
      : "border-gold-500/60 bg-gold-500/15";

  function renderItem(o: Option) {
    const sel = selected.has(o.id);
    const team = o.team_id ? teamById.get(o.team_id) : null;
    const pool = agg?.byOption.get(o.id) ?? 0;
    const pct = agg && agg.total > 0 ? (pool / agg.total) * 100 : 0;
    const odds = agg && pool > 0 ? agg.total / pool : 0;
    const mine = playerId
      ? (agg?.byPlayerOption.get(`${playerId}:${o.id}`) ?? 0)
      : 0;
    return (
      <button
        key={o.id}
        type="button"
        disabled={disabled}
        onClick={() => onToggle(o.id)}
        className={[
          "relative w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-colors",
          sel ? onCls : "border-pitch-700/40 bg-[#06180f] hover:border-pitch-600/60",
          disabled ? "cursor-default opacity-80" : "",
        ].join(" ")}
      >
        {agg && pct > 0 && (
          <span
            className="absolute inset-y-0 left-0 bg-pitch-600/15"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        )}
        <span className="relative flex items-center justify-between gap-1.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={[
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                sel
                  ? accent === "emerald"
                    ? "border-emerald-400 bg-emerald-400 text-[#04121a]"
                    : "border-gold-400 bg-gold-400 text-[#1a1205]"
                  : "border-pitch-700/60 text-transparent",
              ].join(" ")}
              aria-hidden
            >
              ✓
            </span>
            {team?.flag_emoji && (
              <span className="leading-none" aria-hidden>
                {team.flag_emoji}
              </span>
            )}
            <span className="truncate text-sm text-pitch-50">
              {team ? team.name : o.label}
            </span>
          </span>
          {agg && (
            <span className="shrink-0 text-right leading-tight">
              {agg.total > 0 && (
                <span className="block font-mono text-[10px] text-pitch-50/50">
                  {pct.toFixed(0)}%
                  {isParimutuel && pool > 0 ? ` · ${odds.toFixed(1)}×` : ""}
                </span>
              )}
              {mine > 0 && (
                <span className="block font-mono text-[10px] text-gold-300">
                  내 {mine.toLocaleString()}
                </span>
              )}
            </span>
          )}
        </span>
      </button>
    );
  }

  if (!grouped) {
    return <div className="space-y-1.5">{options.map(renderItem)}</div>;
  }

  const byGroup = new Map<string, Option[]>();
  for (const g of WORLD_CUP_GROUPS) byGroup.set(g, []);
  for (const o of options) {
    const t = o.team_id ? teamById.get(o.team_id) : null;
    const g = t?.group_label ?? "기타";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(o);
  }

  return (
    <div className="space-y-2.5">
      {[...byGroup.entries()].map(([g, opts]) =>
        opts.length === 0 ? null : (
          <div key={g}>
            <p className="mb-1 text-[10px] font-semibold text-pitch-400">
              {g}조
            </p>
            <div className="grid grid-cols-2 gap-1.5">{opts.map(renderItem)}</div>
          </div>
        )
      )}
    </div>
  );
}
