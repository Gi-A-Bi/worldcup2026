"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createRoom, joinRoom } from "@/lib/rooms";
import { useSession } from "@/components/SessionProvider";

type Mode = "create" | "join";

export default function EntryScreen() {
  const { signIn } = useSession();
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get("code") ?? "").toUpperCase();

  const [mode, setMode] = useState<Mode>(codeFromUrl ? "join" : "create");

  // 방 만들기 입력
  const [roomName, setRoomName] = useState("");
  const [tournamentName, setTournamentName] = useState("2026 월드컵");
  const [createNick, setCreateNick] = useState("");

  // 입장 입력
  const [joinCode, setJoinCode] = useState(codeFromUrl);
  const [joinNick, setJoinNick] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { session, room, player } = await createRoom({
        roomName,
        tournamentName,
        nickname: createNick,
      });
      signIn(session, room, player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "방 만들기에 실패했어요.");
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { session, room, player } = await joinRoom({
        code: joinCode,
        nickname: joinNick,
      });
      signIn(session, room, player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "입장에 실패했어요.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="text-5xl" aria-hidden>
          ⚽
        </div>
        <h1 className="mt-3 text-2xl font-bold text-pitch-50">
          월드컵 베팅 게임
        </h1>
        <p className="mt-1 text-sm text-pitch-50/60">
          친구들과 가상 칩으로 즐기는 2026 월드컵 베팅
        </p>
      </div>

      {/* 모드 전환 탭 */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-pitch-700/40 bg-pitch-900/40 p-1">
        {(["create", "join"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={[
              "rounded-lg py-2 text-sm font-semibold transition-colors",
              mode === m
                ? "bg-pitch-600 text-white"
                : "text-pitch-50/60 hover:text-pitch-50",
            ].join(" ")}
          >
            {m === "create" ? "방 만들기" : "코드로 입장"}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="방 이름">
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="예: 우리 동네 월드컵"
              maxLength={30}
              required
              className={inputClass}
            />
          </Field>
          <Field label="대회명">
            <input
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="예: 2026 월드컵"
              maxLength={30}
              className={inputClass}
            />
          </Field>
          <Field label="내 닉네임">
            <input
              value={createNick}
              onChange={(e) => setCreateNick(e.target.value)}
              placeholder="예: 김철수"
              maxLength={12}
              required
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? "만드는 중…" : "방 만들기 →"}
          </button>
          <p className="text-center text-xs text-pitch-50/40">
            방을 만들면 6자리 코드가 생성되고 48개 팀이 자동으로 세팅돼요.
          </p>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <Field label="방 코드">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6자리 코드"
              maxLength={6}
              required
              autoCapitalize="characters"
              className={`${inputClass} text-center font-mono text-lg tracking-[0.3em]`}
            />
          </Field>
          <Field label="내 닉네임">
            <input
              value={joinNick}
              onChange={(e) => setJoinNick(e.target.value)}
              placeholder="예: 김철수"
              maxLength={12}
              required
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? "입장 중…" : "입장하기 →"}
          </button>
          <p className="text-center text-xs text-pitch-50/40">
            같은 방에서 같은 닉네임으로 다시 입장하면 기존 기록으로 복귀해요.
          </p>
        </form>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-pitch-700/50 bg-[#06180f] px-3 py-2.5 text-sm text-pitch-50 placeholder:text-pitch-50/30 outline-none focus:border-gold-500/60";

const primaryBtnClass =
  "w-full rounded-lg bg-gold-500 py-3 text-sm font-bold text-[#1a1205] transition-colors hover:bg-gold-400 disabled:opacity-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-pitch-50/70">
        {label}
      </span>
      {children}
    </label>
  );
}
