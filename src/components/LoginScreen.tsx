"use client";

import { useState } from "react";
import { loginPlayer } from "@/lib/auth";
import { fetchRoomById } from "@/lib/rooms";
import { useSession } from "@/components/SessionProvider";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const player = await loginPlayer(nickname, password);
      const room = await fetchRoomById(player.room_id);
      if (!room) throw new Error("게임을 찾을 수 없어요.");
      signIn({ playerId: player.id, nickname: player.nickname }, room, player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했어요.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-2.5 text-sm text-pitch-50 placeholder:text-pitch-50/30 outline-none focus:border-gold-500/60";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="text-5xl" aria-hidden>
          ⚽
        </div>
        <h1 className="mt-3 text-2xl font-bold text-pitch-50">
          우리들의 월드컵 베팅
        </h1>
        <p className="mt-1 text-sm text-pitch-50/60">
          닉네임과 비밀번호로 접속하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-pitch-50/70">
            닉네임
          </span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 김철수"
            maxLength={12}
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-pitch-50/70">
            비밀번호
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            maxLength={30}
            required
            className={inputClass}
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gold-500 py-3 text-sm font-bold text-[#1a1205] transition-colors hover:bg-gold-400 disabled:opacity-50"
        >
          {loading ? "접속 중…" : "접속하기 →"}
        </button>
        <p className="text-center text-xs text-pitch-50/40">
          처음 쓰는 닉네임이면 입력한 비밀번호로 계정이 만들어져요. 다음부터 같은
          비밀번호로 접속하세요.
        </p>
      </form>
    </div>
  );
}
