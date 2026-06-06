"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCategories } from "@/lib/categories";
import { fetchTeams } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import type { CategoryWithOptions, Team } from "@/lib/types";
import { useSession } from "@/components/SessionProvider";
import AddCategoryPanel from "@/components/AddCategoryPanel";
import CategoryCard from "@/components/CategoryCard";

export default function BetPage() {
  const { room, player } = useSession();
  const roomId = room?.id;

  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(() => {
    if (!roomId) return;
    fetchCategories(roomId)
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  // 팀은 한 번만 로드
  useEffect(() => {
    if (!roomId) return;
    fetchTeams(roomId)
      .then(setTeams)
      .catch(() => {});
  }, [roomId]);

  // 카테고리/옵션: 최초 로드 + Realtime 구독 (다른 사람이 추가/마감해도 반영)
  useEffect(() => {
    if (!roomId) return;
    refreshCategories();
    const channel = supabase
      .channel(`room-categories-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `room_id=eq.${roomId}`,
        },
        () => refreshCategories()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        () => refreshCategories()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, refreshCategories]);

  if (!room || !player) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">⚽ 베팅하기</h1>
        <p className="text-sm text-pitch-50/60">
          카테고리를 만들고 옵션을 관리해요. 칩 베팅은 Stage 4에서 추가됩니다.
        </p>
      </header>

      <AddCategoryPanel
        teams={teams}
        roomId={room.id}
        playerId={player.id}
        onCreated={refreshCategories}
      />

      {loading ? (
        <p className="py-6 text-center text-sm text-pitch-50/40">
          불러오는 중…
        </p>
      ) : categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-pitch-700/40 py-8 text-center text-sm text-pitch-50/40">
          아직 카테고리가 없어요. 위에서 추가해보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              teams={teams}
              roomId={room.id}
              playerId={player.id}
              onChanged={refreshCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
