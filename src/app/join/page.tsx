"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

/**
 * 공유 링크 진입점: `/join?code=ABC123`
 *  - 세션 없음 → SessionGate 가 EntryScreen(입장 탭, 코드 자동입력)을 대신 보여줌
 *  - 세션 있음 → 이미 방에 있으므로 메인으로 보냄
 */
export default function JoinPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready") router.replace("/");
  }, [status, router]);

  return null;
}
