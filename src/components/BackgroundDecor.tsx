/**
 * 월드컵(LA 노을) 분위기 배경 — 전부 직접 만든 오리지널 SVG/CSS (저작권/상표 자유).
 * 노을빛 + 태양 + 도시 스카이라인 + 야자수 + 차는 선수 실루엣.
 * 화면 전체 고정, 콘텐츠 뒤(-z-10), 어두운 베이스 유지로 가독성 보존.
 */
export default function BackgroundDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 별 (상단) */}
      <div className="absolute inset-x-0 top-0 h-1/3">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: s.l, top: s.t, width: s.s, height: s.s, opacity: s.o }}
          />
        ))}
      </div>

      {/* 노을빛 (하단 따뜻한 그라데이션) */}
      <div className="absolute inset-x-0 bottom-0 h-[55vh] bg-gradient-to-t from-orange-500/[0.13] via-amber-500/[0.07] to-transparent" />
      {/* 태양 */}
      <div className="absolute bottom-[20vh] left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-300/15 blur-2xl" />
      <div className="absolute bottom-[22vh] left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-amber-200/15 blur-md" />

      {/* 도시 스카이라인 (하단) */}
      <Skyline className="absolute inset-x-0 bottom-[7vh] h-24 w-full text-black/45" />

      {/* 야자수 */}
      <Palm className="absolute bottom-[6vh] left-[3%] h-56 w-24 text-black/45" />
      <Palm className="absolute bottom-[8vh] left-[16%] h-40 w-16 text-black/35" />
      <Palm className="absolute bottom-[6vh] right-[5%] h-64 w-28 -scale-x-100 text-black/45" />

      {/* 차는 선수 */}
      <Player className="absolute bottom-[5vh] right-[24%] h-52 w-36 text-black/45" />

      {/* 잔디(맨 아래) */}
      <div className="absolute inset-x-0 bottom-0 h-[7vh] bg-gradient-to-t from-pitch-900/60 to-transparent" />
    </div>
  );
}

const STARS = [
  { l: "12%", t: "18%", s: 2, o: 0.5 },
  { l: "24%", t: "8%", s: 1.5, o: 0.4 },
  { l: "38%", t: "22%", s: 2, o: 0.35 },
  { l: "55%", t: "10%", s: 1.5, o: 0.5 },
  { l: "68%", t: "20%", s: 2, o: 0.4 },
  { l: "80%", t: "9%", s: 1.5, o: 0.45 },
  { l: "90%", t: "24%", s: 2, o: 0.3 },
  { l: "46%", t: "6%", s: 1.5, o: 0.4 },
];

function Skyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className={className}
      fill="currentColor"
    >
      <path d="M0 120 V70 h40 V50 h30 V80 h50 V40 h26 V66 h44 V86 h60 V30 h20 V60 h40 V78 h54 V54 h30 V120 Z" />
      <path d="M520 120 V44 h24 V20 h14 V44 h26 V70 h40 V52 h30 V120 Z" />
      <path d="M700 120 V60 h50 V36 h22 V60 h44 V84 h56 V48 h28 V72 h46 V120 Z" />
      <path d="M1000 120 V66 h40 V40 h24 V66 h46 V86 h60 V56 h30 V120 Z" />
    </svg>
  );
}

function Palm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 220" className={className} fill="currentColor">
      {/* 줄기 */}
      <path d="M48 220 C46 150 44 100 50 60 l5 0 C50 100 52 150 54 220 Z" />
      {/* 잎 */}
      <g>
        <path d="M52 58 C30 40 14 40 2 52 C20 46 36 50 50 62 Z" />
        <path d="M52 58 C40 30 26 20 10 18 C30 26 42 40 50 60 Z" />
        <path d="M52 58 C52 28 58 12 70 4 C58 22 54 38 54 60 Z" />
        <path d="M52 58 C74 40 90 42 98 56 C82 48 66 50 54 62 Z" />
        <path d="M52 58 C66 32 82 24 96 26 C76 30 62 42 54 60 Z" />
      </g>
      {/* 코코넛 */}
      <circle cx="50" cy="62" r="4" />
    </svg>
  );
}

function Player({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 200" className={className} fill="currentColor">
      <circle cx="62" cy="24" r="13" />
      <path d="M50 40 q14 -6 26 4 l-4 46 q-12 6 -24 0 Z" />
      <path d="M50 46 q-16 8 -20 26 l8 4 q8 -16 18 -22 Z" />
      <path d="M76 46 q16 6 18 22 l-8 4 q-6 -14 -16 -20 Z" />
      <path d="M52 86 q-4 28 -22 40 l8 8 q22 -14 28 -44 Z" />
      <path d="M68 86 q6 26 20 36 l-6 9 q-20 -12 -28 -40 Z" />
      <circle cx="20" cy="140" r="11" opacity="0.9" />
    </svg>
  );
}
