/**
 * 월드컵 분위기 배경 데코 (오리지널 SVG — 저작권/상표 자유).
 * 경기장 실루엣 · 축구공 육각 패턴 · 트로피 · 선수 실루엣 · 컨페티.
 * 화면 전체 고정, 콘텐츠 뒤(-z-10), 가독성 위해 아주 은은하게.
 */
export default function BackgroundDecor() {
  const confetti = [
    { left: "8%", top: "12%", c: "#fbbf24", d: "0s", r: "20deg" },
    { left: "22%", top: "6%", c: "#34d399", d: "1.5s", r: "-15deg" },
    { left: "40%", top: "10%", c: "#e6f4ec", d: "3s", r: "35deg" },
    { left: "63%", top: "7%", c: "#fbbf24", d: "0.8s", r: "10deg" },
    { left: "78%", top: "13%", c: "#34d399", d: "2.2s", r: "-25deg" },
    { left: "90%", top: "9%", c: "#fcd34d", d: "4s", r: "45deg" },
    { left: "15%", top: "30%", c: "#10b981", d: "2.8s", r: "5deg" },
    { left: "85%", top: "34%", c: "#fbbf24", d: "1.2s", r: "-30deg" },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 상단 골드/그린 글로우 */}
      <div className="absolute -top-40 left-1/2 h-80 w-[130%] -translate-x-1/2 rounded-full bg-pitch-500/10 blur-[100px]" />

      {/* 축구공 육각 모티프 */}
      <SoccerBall className="absolute -left-12 top-28 h-44 w-44 rotate-12 text-pitch-400/[0.05]" />
      <SoccerBall className="absolute -right-10 top-[46%] h-32 w-32 -rotate-6 text-gold-400/[0.05]" />

      {/* 트로피 */}
      <Trophy className="absolute right-6 top-20 h-20 w-20 text-gold-500/[0.07]" />

      {/* 컨페티 */}
      {confetti.map((p, i) => (
        <span
          key={i}
          className="absolute h-2.5 w-2.5 rounded-[2px] animate-[wc-float_7s_ease-in-out_infinite]"
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.c,
            opacity: 0.18,
            transform: `rotate(${p.r})`,
            animationDelay: p.d,
          }}
        />
      ))}

      {/* 하단 경기장 + 선수 */}
      <Stadium className="absolute inset-x-0 bottom-0 h-[42vh] w-full text-pitch-700/[0.22]" />
      <Player className="absolute bottom-[6vh] right-[6%] h-56 w-40 text-pitch-900/50" />
      <Player className="absolute bottom-[5vh] left-[4%] h-44 w-32 -scale-x-100 text-pitch-900/40" />
    </div>
  );
}

function SoccerBall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="50" cy="50" r="46" />
      <polygon points="50,33 63,42 58,58 42,58 37,42" fill="currentColor" />
      <path d="M50 4 L50 33 M88 38 L63 42 M73 86 L58 58 M27 86 L42 58 M12 38 L37 42" />
      <path d="M50 4 L88 38 L73 86 L27 86 L12 38 Z" opacity="0.5" />
    </svg>
  );
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor">
      <path d="M20 8h24v10a12 12 0 0 1-24 0V8Z" />
      <path d="M14 12h6v6a6 6 0 0 1-6-6Zm36 0h-6v6a6 6 0 0 0 6-6Z" />
      <rect x="29" y="30" width="6" height="12" />
      <rect x="22" y="42" width="20" height="5" rx="1" />
      <rect x="18" y="50" width="28" height="6" rx="1" />
    </svg>
  );
}

function Stadium({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 400"
      preserveAspectRatio="none"
      className={className}
      fill="currentColor"
    >
      {/* 관중석 보울 */}
      <path d="M0 400 L0 230 Q600 90 1200 230 L1200 400 Z" />
      {/* 필드 개구부 (어둡게 비움) */}
      <path d="M120 400 Q600 210 1080 400 Z" fill="#05140d" opacity="0.6" />
      {/* 조명탑 */}
      <g>
        <rect x="150" y="120" width="8" height="120" />
        <ellipse cx="154" cy="112" rx="44" ry="16" opacity="0.9" />
        <rect x="1042" y="120" width="8" height="120" />
        <ellipse cx="1046" cy="112" rx="44" ry="16" opacity="0.9" />
      </g>
    </svg>
  );
}

/** 오리지널 선수 실루엣 (드리블 자세) */
function Player({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 200" className={className} fill="currentColor">
      <circle cx="62" cy="24" r="13" />
      {/* 몸통 */}
      <path d="M50 40 q14 -6 26 4 l-4 46 q-12 6 -24 0 Z" />
      {/* 팔 */}
      <path d="M50 46 q-16 8 -20 26 l8 4 q8 -16 18 -22 Z" />
      <path d="M76 46 q16 6 18 22 l-8 4 q-6 -14 -16 -20 Z" />
      {/* 앞다리(차는 다리) */}
      <path d="M52 86 q-4 28 -22 40 l8 8 q22 -14 28 -44 Z" />
      {/* 뒷다리 */}
      <path d="M68 86 q6 26 20 36 l-6 9 q-20 -12 -28 -40 Z" />
      {/* 공 */}
      <circle cx="20" cy="140" r="11" opacity="0.9" />
    </svg>
  );
}
