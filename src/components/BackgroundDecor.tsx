/**
 * 배경 이미지 (사용자가 직접 만든/라이선스 보유 이미지).
 * public/bg.jpg 파일을 배경으로 깔고, 가독성을 위해 어두운 오버레이를 덮는다.
 * 파일이 없으면 그냥 어두운 배경만 보인다(깨짐 없음).
 * 화면 전체 고정, 콘텐츠 뒤(-z-10).
 */
export default function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/bg.jpg)", opacity: 0.55 }}
      />
      {/* 가독성용 어두운 오버레이 (위·아래 더 진하게) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05140d]/92 via-[#05140d]/60 to-[#05140d]/95" />
      {/* 좌우 살짝 어둡게 (텍스트 대비) */}
      <div className="absolute inset-0 bg-[#05140d]/25" />
    </div>
  );
}
