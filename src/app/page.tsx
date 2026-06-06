"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchPlayers, fetchTeams } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import type { Player, Team } from "@/lib/types";
import { useSession } from "@/components/SessionProvider";
import GroupStandings from "@/components/GroupStandings";

/**
 * 메인 화면: 방 정보 + 공유 + 참가자 리스트 + 조별 명단.
 */
export default function HomePage() {
  const { room, player, signOut } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const roomId = room?.id;

  const refresh = useCallback(() => {
    if (!roomId) return;
    fetchPlayers(roomId)
      .then(setPlayers)
      .catch(() => {});
  }, [roomId]);

  // 조별 명단 (teams) 로드
  useEffect(() => {
    if (!roomId) return;
    fetchTeams(roomId)
      .then(setTeams)
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

  return (
    <div className="space-y-6">
      {/* 게임 헤더 */}
      <section className="rounded-2xl border border-pitch-700/40 bg-pitch-900/40 p-5">
        <p className="text-xs text-pitch-400">{room.name}</p>
        <h1 className="text-lg font-bold text-pitch-50">
          {room.tournament_name?.trim() || room.name}
        </h1>
        <p className="mt-1 text-sm text-pitch-50/60">
          {player.nickname} 님, 환영해요! 보유 칩{" "}
          <span className="font-mono text-gold-300">
            {player.chips.toLocaleString()}
          </span>
        </p>
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

      {/* 조별 명단 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-pitch-50">조별 명단</h2>
          <span className="text-xs text-pitch-50/40">
            12개 조 · {teams.length}팀
          </span>
        </div>
        {teams.length === 0 ? (
          <p className="rounded-xl border border-dashed border-pitch-700/40 px-4 py-6 text-center text-sm text-pitch-50/40">
            팀 명단을 불러오는 중…
          </p>
        ) : (
          <GroupStandings teams={teams} />
        )}
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
            if (
              confirm(
                "로그아웃할까요? (이 기기의 접속만 풀리고 기록/칩은 그대로 남아요)"
              )
            ) {
              signOut();
            }
          }}
          className="rounded-lg border border-pitch-700/40 py-2.5 text-center text-xs text-pitch-50/50 hover:text-pitch-50"
        >
          로그아웃
        </button>
      </section>
    </div>
  );
}
