import { isSubdivisionFlag } from "@/lib/flags";

/**
 * 국기 표시. 일반 국기는 이모지 그대로,
 * 서브디비전 국기(잉글랜드/스코틀랜드 등 깨지는 것)는 국가코드 배지로 대체.
 */
export default function Flag({
  emoji,
  code,
}: {
  emoji?: string | null;
  code?: string | null;
}) {
  if (isSubdivisionFlag(emoji)) {
    return (
      <span className="inline-block rounded-sm bg-pitch-700/60 px-1 align-middle text-[9px] font-bold leading-[1.4] text-pitch-50/90">
        {code ?? "🏴"}
      </span>
    );
  }
  return (
    <span className="leading-none" aria-hidden>
      {emoji}
    </span>
  );
}
