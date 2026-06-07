import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundDecor from "@/components/BackgroundDecor";
import { SessionProvider } from "@/components/SessionProvider";
import SessionGate from "@/components/SessionGate";

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
        <BackgroundDecor />
        <SessionProvider>
          <SessionGate>{children}</SessionGate>
        </SessionProvider>
      </body>
    </html>
  );
}
