"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useSession } from "@/components/SessionProvider";

/** 세션이 있을 때만 렌더되는 앱 셸: 헤더(대회명/보유 칩) + 본문 + 탭 네비 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { room, player } = useSession();
  const title = room?.tournament_name?.trim() || room?.name || "월드컵 베팅";

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-pitch-700/40 bg-[#04130c]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <span className="text-xl" aria-hidden>
              ⚽
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-pitch-50">
                {title}
              </p>
              <p className="text-[11px] text-pitch-400">
                {room ? `코드 ${room.code}` : "2026 월드컵"}
                {player ? ` · ${player.nickname}` : ""}
              </p>
            </div>
          </Link>
          <div className="shrink-0 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-right">
            <p className="text-[10px] text-gold-300/80">보유 칩</p>
            <p className="font-mono text-sm font-bold text-gold-300">
              {(player?.chips ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
        {/* 데스크톱 가로 메뉴 */}
        <div className="mx-auto hidden max-w-3xl px-2 pb-2 sm:block">
          <BottomNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 sm:pb-8">
        {children}
      </main>

      {/* 모바일 하단 탭 */}
      <div className="sm:hidden">
        <BottomNav />
      </div>
    </>
  );
}
