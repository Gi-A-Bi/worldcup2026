"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 예전 공유 링크(/join) 호환용 — 이제는 닉네임/비밀번호 로그인이라 홈으로 보냄. */
export default function JoinPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
