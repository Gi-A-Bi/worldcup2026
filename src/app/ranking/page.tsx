import ComingSoon from "@/components/ComingSoon";

export default function RankingPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">🏆 순위표</h1>
        <p className="text-sm text-pitch-50/60">보유 칩 기준 실시간 랭킹.</p>
      </header>
      <ComingSoon
        stage="Stage 6"
        items={[
          "보유 칩 기준 랭킹 (1~6위) + 최근 정산 손익 델타(+/−)",
          "묶인 칩 섹션: 대회 종료 후 정산되는 베팅 (예: 우승팀)",
          "탈락 베팅 섹션: 결과 확정으로 손실이 확정된 베팅",
        ]}
      />
    </div>
  );
}
