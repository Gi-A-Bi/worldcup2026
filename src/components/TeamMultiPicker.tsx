"use client";

import { WORLD_CUP_GROUPS } from "@/lib/worldcupTeams";
import type { Team } from "@/lib/types";
import Flag from "@/components/Flag";

/** 조별로 묶어 팀을 복수 선택하는 체크박스 피커 */
export default function TeamMultiPicker({
  teams,
  selectedIds,
  onToggle,
  disabledIds = [],
}: {
  teams: Team[];
  selectedIds: Set<string>;
  onToggle: (team: Team) => void;
  disabledIds?: string[];
}) {
  const disabled = new Set(disabledIds);
  const byGroup = new Map<string, Team[]>();
  for (const g of WORLD_CUP_GROUPS) byGroup.set(g, []);
  for (const t of teams) {
    if (!byGroup.has(t.group_label)) byGroup.set(t.group_label, []);
    byGroup.get(t.group_label)!.push(t);
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-pitch-700/40 bg-[#04130c] p-2">
      {Array.from(byGroup.entries()).map(([group, groupTeams]) =>
        groupTeams.length === 0 ? null : (
          <div key={group} className="mb-2 last:mb-0">
            <p className="mb-1 px-1 text-[10px] font-semibold text-pitch-400">
              {group}조
            </p>
            <div className="grid grid-cols-2 gap-1">
              {groupTeams.map((t) => {
                const isDisabled = disabled.has(t.id);
                const checked = selectedIds.has(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    disabled={isDisabled}
                    onClick={() => onToggle(t)}
                    className={[
                      "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      isDisabled
                        ? "cursor-not-allowed text-pitch-50/25"
                        : checked
                          ? "bg-pitch-600/30 text-pitch-50"
                          : "text-pitch-50/70 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                        checked
                          ? "border-gold-500 bg-gold-500 text-[#1a1205]"
                          : "border-pitch-700/60",
                      ].join(" ")}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <Flag emoji={t.flag_emoji} code={t.fifa_code} />
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
