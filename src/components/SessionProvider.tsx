"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { fetchPlayer, fetchRoomByCode } from "@/lib/rooms";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import type { Player, Room, Session } from "@/lib/types";

type Status = "loading" | "no-session" | "ready";

type SessionContextValue = {
  status: Status;
  session: Session | null;
  room: Room | null;
  player: Player | null;
  /** 방 생성/입장 성공 후 호출 (세션 저장 + 상태 반영) */
  signIn: (session: Session, room: Room, player: Player) => void;
  /** 방 나가기 (세션 삭제) */
  signOut: () => void;
  /** DB에서 방/플레이어 정보 다시 불러오기 (칩 갱신 등) */
  reload: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession 은 SessionProvider 안에서만 사용할 수 있어요.");
  }
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const applyFromSession = useCallback(async (s: Session) => {
    try {
      const [r, p] = await Promise.all([
        fetchRoomByCode(s.roomCode),
        fetchPlayer(s.playerId),
      ]);
      // 방/플레이어가 사라졌거나 어긋나면 세션 폐기
      if (!r || !p || p.room_id !== r.id) {
        clearSession();
        setSession(null);
        setRoom(null);
        setPlayer(null);
        setStatus("no-session");
        return;
      }
      setSession(s);
      setRoom(r);
      setPlayer(p);
      setStatus("ready");
    } catch {
      // 네트워크 등 오류 시엔 세션을 지우지 않고 입장 화면으로
      setStatus("no-session");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = loadSession();
      if (!stored) {
        setStatus("no-session");
        return;
      }
      await applyFromSession(stored);
    })();
  }, [applyFromSession]);

  const signIn = useCallback(
    (s: Session, r: Room, p: Player) => {
      saveSession(s);
      setSession(s);
      setRoom(r);
      setPlayer(p);
      setStatus("ready");
    },
    []
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    setRoom(null);
    setPlayer(null);
    setStatus("no-session");
  }, []);

  const reload = useCallback(async () => {
    if (session) await applyFromSession(session);
  }, [session, applyFromSession]);

  return (
    <SessionContext.Provider
      value={{ status, session, room, player, signIn, signOut, reload }}
    >
      {children}
    </SessionContext.Provider>
  );
}
