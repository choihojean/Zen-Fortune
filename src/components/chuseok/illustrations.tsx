/**
 * 한가위 일러스트 (SVG). 캐릭터 실물 일러스트가 오기 전까지 쓰는 placeholder 이며,
 * Astro 페이지(SSR)와 React 아일랜드 양쪽에서 그대로 쓴다.
 */

/** 보름달 위의 토끼 — 랜딩 */
export function MoonRabbit({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <circle cx="110" cy="112" r="82" fill="#f4c86a" />
      <circle cx="82" cy="90" r="9" fill="#e9b653" />
      <circle cx="140" cy="140" r="6" fill="#e9b653" />
      <circle cx="128" cy="76" r="4" fill="#e9b653" />
      <path d="M96 130c0-18 8-30 22-30s22 12 22 30c0 14-10 24-22 24s-22-10-22-24z" fill="#fff8ec" />
      <path d="M104 104c-4-18-2-36 4-44 4 10 4 26 2 40" fill="#fff8ec" />
      <path d="M132 104c4-18 2-36-4-44-4 10-4 26-2 40" fill="#fff8ec" />
      <path d="M106 66c2 8 2 22 1 32" stroke="#f7c9c0" strokeWidth="4" strokeLinecap="round" />
      <path d="M130 66c-2 8-2 22-1 32" stroke="#f7c9c0" strokeWidth="4" strokeLinecap="round" />
      <circle cx="111" cy="122" r="2.6" fill="#1b2140" />
      <circle cx="125" cy="122" r="2.6" fill="#1b2140" />
      <path d="M115 130c1.5 2 4.5 2 6 0" stroke="#1b2140" strokeWidth="2" strokeLinecap="round" />
      <circle cx="105" cy="131" r="3.5" fill="#f7a99a" opacity="0.8" />
      <circle cx="131" cy="131" r="3.5" fill="#f7a99a" opacity="0.8" />
      <path d="M150 128l14-30 6 30-9-3z" fill="#7b5a3a" />
      <path d="M40 176c14-10 34-10 48 0" stroke="#ef6b4c" strokeWidth="10" strokeLinecap="round" />
      <path d="M60 170c0-12 12-20 22-14" stroke="#7ea77b" strokeWidth="6" strokeLinecap="round" />
      <path d="M144 184c10-8 26-8 36 0" stroke="#f7a99a" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

/** 떡방아 찧는 토끼 — 로딩. `.ch-mallet` 에 CSS 애니메이션이 붙는다. */
export function PoundingRabbit({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <circle cx="110" cy="110" r="84" fill="#f4c86a" />
      <circle cx="80" cy="88" r="9" fill="#e9b653" />
      <circle cx="142" cy="140" r="6" fill="#e9b653" />
      <rect x="70" y="140" width="80" height="26" rx="10" fill="#7b5a3a" />
      <ellipse cx="110" cy="140" rx="34" ry="8" fill="#fff8ec" />
      <path d="M78 124c0-16 8-28 20-28s20 12 20 28c0 12-9 20-20 20s-20-8-20-20z" fill="#fff8ec" />
      <path d="M86 100c-4-16-2-30 3-38 4 9 3 24 2 36" fill="#fff8ec" />
      <path d="M110 100c4-16 2-30-3-38-4 9-3 24-2 36" fill="#fff8ec" />
      <circle cx="93" cy="118" r="2.4" fill="#1b2140" />
      <circle cx="104" cy="118" r="2.4" fill="#1b2140" />
      <path d="M96 125c1.5 1.6 4 1.6 5.5 0" stroke="#1b2140" strokeWidth="1.8" strokeLinecap="round" />
      <g className="ch-mallet">
        <rect x="146" y="60" width="8" height="60" rx="4" fill="#7b5a3a" />
        <rect x="132" y="48" width="36" height="22" rx="8" fill="#b94a30" />
      </g>
    </svg>
  );
}

/** 질문 카드 모서리의 작은 달 얼굴 */
export function MoonFace({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#f4c86a" />
      <path d="M14 30c4-10 16-10 20 0" stroke="#1b2140" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18" cy="21" r="2" fill="#1b2140" />
      <circle cx="30" cy="21" r="2" fill="#1b2140" />
    </svg>
  );
}

/** 당황한 달 — 결과 없음 */
export function PuzzledMoon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="48" cy="48" r="40" fill="#f4c86a" />
      <circle cx="36" cy="44" r="3.5" fill="#1b2140" />
      <circle cx="60" cy="44" r="3.5" fill="#1b2140" />
      <path d="M38 62c5-5 15-5 20 0" stroke="#1b2140" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 30l8 4M68 30l-8 4" stroke="#1b2140" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** 복주머니 브랜드 마크 — 상단 바 로고 자리. 생성 이미지(public/chuseok/pouch-mark.png)를 원형으로 표시 */
export function PouchMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src="/chuseok/pouch-mark.png"
      alt=""
      width={size}
      height={size}
      className="ch-brand-img"
      aria-hidden="true"
    />
  );
}

/** 복주머니 — 응모 카드 장식 */
export function LuckyPouch({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true" className="ch-draw-deco">
      <path d="M60 10c-8 18-26 22-26 44 0 20 12 32 26 32s26-12 26-32c0-22-18-26-26-44z" fill="#fff8ec" />
      <path d="M40 40h40" stroke="#1b2140" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** 컨페티 — 응모 완료 */
export function Confetti() {
  return (
    <svg width="390" height="90" viewBox="0 0 390 90" fill="none" aria-hidden="true" className="ch-confetti">
      <rect x="30" y="18" width="10" height="4" rx="2" fill="#ef6b4c" transform="rotate(-20 35 20)" />
      <rect x="90" y="8" width="10" height="4" rx="2" fill="#7ea77b" transform="rotate(30 95 10)" />
      <rect x="150" y="26" width="10" height="4" rx="2" fill="#f4c86a" transform="rotate(-40 155 28)" />
      <rect x="230" y="10" width="10" height="4" rx="2" fill="#ef6b4c" transform="rotate(15 235 12)" />
      <rect x="300" y="24" width="10" height="4" rx="2" fill="#7ea77b" transform="rotate(-25 305 26)" />
      <rect x="350" y="12" width="10" height="4" rx="2" fill="#f4c86a" transform="rotate(40 355 14)" />
      <circle cx="60" cy="40" r="3" fill="#f4c86a" />
      <circle cx="200" cy="44" r="3" fill="#ef6b4c" />
      <circle cx="330" cy="46" r="3" fill="#7ea77b" />
    </svg>
  );
}
