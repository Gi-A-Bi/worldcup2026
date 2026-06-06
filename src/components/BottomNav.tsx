"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/nav";

/**
 * 반응형 탭 네비게이션.
 *  - 모바일: 화면 하단 고정 탭바
 *  - 데스크톱(sm+): 상단 가로 메뉴
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-pitch-700/40 bg-[#04130c]/95 backdrop-blur
                 sm:static sm:border-t-0 sm:bg-transparent sm:backdrop-blur-0"
    >
      <ul className="mx-auto flex max-w-3xl sm:gap-2">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  "sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm",
                  active
                    ? "text-gold-400 sm:bg-pitch-600/20 sm:text-gold-300"
                    : "text-pitch-50/60 hover:text-pitch-50 sm:hover:bg-white/5",
                ].join(" ")}
              >
                <span className="text-base sm:text-base" aria-hidden>
                  {tab.emoji}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
