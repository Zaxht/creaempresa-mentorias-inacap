// Original vector composition: two paths meeting, then moving forward together.
// Decorative only; it does not represent programme data or real participants.
export function MentoringArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`mentoring-art ${className}`}
      viewBox="0 0 620 360"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="art-guide"
        d="M16 310H604M64 18V334M550 18V334"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      <path
        d="M128 306V159C128 94 170 57 221 57C272 57 314 94 314 159V306"
        stroke="#F8F3E9"
        strokeWidth="78"
      />
      <path
        d="M306 306V215C306 150 348 113 399 113C450 113 492 150 492 215V306"
        stroke="#EF9D9F"
        strokeWidth="78"
      />
      <path d="M314 178V306" stroke="#F8F3E9" strokeWidth="78" />
      <path
        className="art-thread"
        d="M73 274C128 274 180 260 222 221C272 173 315 178 345 207C393 253 420 267 493 267H565"
        stroke="#1D2927"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M551 254L565 267L551 280"
        stroke="#1D2927"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="73" cy="274" r="7" fill="#1D2927" />
      <g className="art-spark" stroke="#F8F3E9" strokeWidth="2">
        <path d="M511 25V79M484 52H538M492 33L530 71M492 71L530 33" />
      </g>
      <circle cx="399" cy="215" r="6" fill="#1D2927" />
      <path d="M43 111H70M56.5 97.5V124.5" stroke="#F8F3E9" strokeWidth="1.5" />
    </svg>
  );
}
