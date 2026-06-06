import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "월드컵 베팅 게임",
  description: "친구 모임용 2026 월드컵 가상 칩 베팅 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* 헤더: 대회명 + 보유 칩 (값은 Stage 2 이후 방/플레이어 연동) */}
        <header className="sticky top-0 z-10 border-b border-pitch-700/40 bg-[#04130c]/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                ⚽
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-pitch-50">월드컵 베팅</p>
                <p className="text-[11px] text-pitch-400">
                  2026 · 조별 명단 보기
                </p>
              </div>
            </Link>
            <div className="rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-right">
              <p className="text-[10px] text-gold-300/80">보유 칩</p>
              <p className="font-mono text-sm font-bold text-gold-300">10,000</p>
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
      </body>
    </html>
  );
}
