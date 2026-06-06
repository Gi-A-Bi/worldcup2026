import Link from "next/link";
import { TABS } from "@/lib/nav";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/**
 * 메인 / 조별 명단 화면 (스켈레톤).
 * 12개 조(A~L) × 4팀 그리드. 실제 팀 데이터는 방 생성 시 teams 테이블에서
 * 채워진다 (Stage 2: 48팀 템플릿 자동 삽입).
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-pitch-700/40 bg-pitch-900/40 p-5">
        <h1 className="text-lg font-bold text-pitch-50">2026 월드컵 베팅 게임</h1>
        <p className="mt-1 text-sm text-pitch-50/70">
          친구들과 가상 칩으로 즐기는 베팅 게임. 48개 팀 · 12개 조 · Round of 32.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-full border border-pitch-700/50 bg-pitch-600/10 px-3 py-1.5 text-xs font-medium text-pitch-50/80 transition-colors hover:border-gold-500/40 hover:text-gold-300"
            >
              {t.emoji} {t.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-pitch-50">조별 명단</h2>
          <span className="text-xs text-pitch-50/50">
            방 생성 시 48팀 자동 세팅 (Stage 2)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div
              key={g}
              className="rounded-xl border border-pitch-700/40 bg-[#06180f] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold-500/20 text-xs font-bold text-gold-300">
                  {g}
                </span>
                <span className="text-xs text-pitch-50/50">조</span>
              </div>
              <ul className="space-y-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-pitch-50/40"
                  >
                    <span
                      className="h-4 w-5 rounded-sm bg-white/5"
                      aria-hidden
                    />
                    <span
                      className="h-2 flex-1 rounded bg-white/5"
                      aria-hidden
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
