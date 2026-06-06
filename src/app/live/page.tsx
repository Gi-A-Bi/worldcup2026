import ComingSoon from "@/components/ComingSoon";

export default function LivePage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">🔴 라이브 현황</h1>
        <p className="text-sm text-pitch-50/60">
          모든 참여자의 베팅이 실시간으로 갱신된다.
        </p>
      </header>
      <ComingSoon
        stage="Stage 4"
        items={[
          "LIVE 인디케이터 (Supabase Realtime 구독 자동 갱신)",
          "카테고리별 분포 시각화 (막대그래프 + 퍼센티지)",
          "누가 어디에 얼마 걸었는지 칩 형태 표시 (예: 김 → BRA 2,000)",
        ]}
      />
    </div>
  );
}
