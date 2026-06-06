"use client";

import { WORLD_CUP_GROUPS } from "@/lib/worldcupTeams";
import type { Team } from "@/lib/types";

/** 조별 명단 보기: 12개 조(A~L) × 4팀, 국기 (CLAUDE.md §7) */
export default function GroupStandings({ teams }: { teams: Team[] }) {
  const byGroup = new Map<string, Team[]>();
  for (const g of WORLD_CUP_GROUPS) byGroup.set(g, []);
  for (const t of teams) {
    if (!byGroup.has(t.group_label)) byGroup.set(t.group_label, []);
    byGroup.get(t.group_label)!.push(t);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from(byGroup.entries()).map(([group, groupTeams]) => (
        <div
          key={group}
          className="rounded-xl border border-pitch-700/40 bg-[#06180f] p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold-500/20 text-xs font-bold text-gold-300">
              {group}
            </span>
            <span className="text-xs text-pitch-50/50">조</span>
          </div>
          <ul className="space-y-1.5">
            {groupTeams.length === 0 && (
              <li className="text-xs text-pitch-50/30">—</li>
            )}
            {groupTeams.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 text-sm text-pitch-50/90"
              >
                <span className="text-base leading-none" aria-hidden>
                  {t.flag_emoji}
                </span>
                <span className="truncate">{t.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
