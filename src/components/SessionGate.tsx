"use client";

import AppShell from "@/components/AppShell";
import LoginScreen from "@/components/LoginScreen";
import { useSession } from "@/components/SessionProvider";

/**
 * 세션 상태에 따라 화면을 가른다.
 *  - loading: 로딩 표시
 *  - no-session: 입장 화면 (방 만들기 / 코드로 입장)
 *  - ready: 앱 셸 + 실제 페이지(children)
 */
export default function SessionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-pitch-50/60">
        <span className="text-4xl" aria-hidden>
          ⚽
        </span>
        <p className="text-sm">불러오는 중…</p>
      </div>
    );
  }

  if (status === "no-session") {
    return <LoginScreen />;
  }

  return <AppShell>{children}</AppShell>;
}
