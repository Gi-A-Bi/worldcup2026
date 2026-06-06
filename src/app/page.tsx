"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchPlayers } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { useSession } from "@/components/SessionProvider";

/**
 * 메인 화면 (Stage 2): 방 정보 + 공유 + 참가자 리스트.
 * 조별 명단 상세 보기는 Stage 3에서 추가.
 */
export default function HomePage() {
  const { room, player, signOut } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const roomId = room?.id;

  const refresh = useCallback(() => {
    if (!roomId) return;
    fetchPlayers(roomId)
      .then(setPlayers)
      .catch(() => {});
  }, [roomId]);

  // 참가자 리스트: 최초 로드 + Realtime 구독으로 새 참가자 자동 반영
  useEffect(() => {
    if (!roomId) return;
    refresh();
    const channel = supabase
      .channel(`room-players-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refresh]);

  if (!room || !player) return null;

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${room.code}`
      : `/join?code=${room.code}`;

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // 클립보드 권한 없으면 무시
    }
  }

  return (
    <div className="space-y-6">
      {/* 방 / 공유 카드 */}
      <section className="rounded-2xl border border-pitch-700/40 bg-pitch-900/40 p-5">
        <p className="text-xs text-pitch-400">{room.name}</p>
        <h1 className="text-lg font-bold text-pitch-50">
          {room.tournament_name?.trim() || room.name}
        </h1>

        <div className="mt-4 rounded-xl border border-gold-500/30 bg-gold-500/5 p-4">
          <p className="text-xs text-gold-300/80">방 코드</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-gold-300">
              {room.code}
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => copy(room.code, "code")}
                className="rounded-lg border border-pitch-700/50 px-3 py-1.5 text-xs font-medium text-pitch-50/80 hover:border-gold-500/40 hover:text-gold-300"
              >
                {copied === "code" ? "복사됨!" : "코드 복사"}
              </button>
              <button
                type="button"
                onClick={() => copy(inviteLink, "link")}
                className="rounded-lg border border-pitch-700/50 px-3 py-1.5 text-xs font-medium text-pitch-50/80 hover:border-gold-500/40 hover:text-gold-300"
              >
                {copied === "link" ? "복사됨!" : "초대링크 복사"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-pitch-50/40">
            친구에게 코드나 초대링크를 공유하면 함께 베팅할 수 있어요.
          </p>
        </div>
      </section>

      {/* 참가자 리스트 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-pitch-50">
            참가자{" "}
            <span className="text-pitch-400">({players.length})</span>
          </h2>
          <span className="flex items-center gap-1.5 text-[11px] text-pitch-50/40">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pitch-400" />
            실시간
          </span>
        </div>

        <ul className="space-y-2">
          {players.map((p) => {
            const isMe = p.id === player.id;
            return (
              <li
                key={p.id}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3",
                  isMe
                    ? "border-gold-500/40 bg-gold-500/10"
                    : "border-pitch-700/40 bg-[#06180f]",
                ].join(" ")}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-pitch-50">
                  {p.nickname}
                  {isMe && (
                    <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] text-gold-300">
                      나
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm text-gold-300">
                  {p.chips.toLocaleString()}
                  <span className="ml-1 text-[10px] text-pitch-50/40">칩</span>
                </span>
              </li>
            );
          })}
          {players.length === 0 && (
            <li className="rounded-xl border border-dashed border-pitch-700/40 px-4 py-6 text-center text-sm text-pitch-50/40">
              아직 참가자가 없어요.
            </li>
          )}
        </ul>
      </section>

      {/* 액션 */}
      <section className="flex flex-col gap-2">
        <Link
          href="/bet"
          className="rounded-lg bg-pitch-600 py-3 text-center text-sm font-bold text-white hover:bg-pitch-500"
        >
          베팅하러 가기 →
        </Link>
        <button
          type="button"
          onClick={() => {
            if (confirm("방에서 나갈까요? (이 기기의 세션만 사라지고 기록은 남아요)")) {
              signOut();
            }
          }}
          className="rounded-lg border border-pitch-700/40 py-2.5 text-center text-xs text-pitch-50/50 hover:text-pitch-50"
        >
          방 나가기
        </button>
      </section>
    </div>
  );
}
