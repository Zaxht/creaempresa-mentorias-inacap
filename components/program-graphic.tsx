// A small family of editorial marks, drawn for each section of the programme.
export function ProgramGraphic({
  variant = 'people',
  compact = false,
}: {
  variant?: 'people' | 'progress' | 'reports';
  compact?: boolean;
}) {
  return (
    <svg
      className={`program-graphic ${compact ? 'graphic-compact' : ''}`}
      viewBox="0 0 240 150"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 132H228" stroke="#D5D1C9" />
      {variant === 'people' ? (
        <>
          <path
            d="M46 132V68C46 39 65 23 88 23C111 23 130 39 130 68V132"
            stroke="#C71B35"
            strokeWidth="36"
          />
          <path
            d="M128 132V92C128 63 147 47 170 47C193 47 212 63 212 92V132"
            stroke="#E6AAA8"
            strokeWidth="36"
          />
          <path d="M130 83V132" stroke="#C71B35" strokeWidth="36" />
          <path
            d="M24 117C77 117 86 77 118 83C151 89 159 115 220 115"
            stroke="#273C36"
            strokeWidth="2"
          />
          <circle cx="24" cy="117" r="4" fill="#273C36" />
        </>
      ) : variant === 'progress' ? (
        <>
          <path
            d="M37 132V100H84V72H131V43H178V15H215V132H37Z"
            fill="#E9AAA8"
          />
          <path
            d="M37 132V100H84V72H131V43H178V15"
            stroke="#C71B35"
            strokeWidth="18"
          />
          <path
            d="M33 70C96 70 105 17 151 17"
            stroke="#273C36"
            strokeWidth="2"
            strokeDasharray="3 5"
          />
          <circle cx="37" cy="70" r="5" fill="#273C36" />
          <path d="M144 9L153 17L144 25" stroke="#273C36" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M57 20L154 6L179 129L82 143Z" fill="#E9AAA8" />
          <path d="M87 15H192V132H87Z" fill="#C71B35" />
          <path
            d="M110 42H169M110 57H169M110 72H145"
            stroke="#FFF6EA"
            strokeWidth="3"
          />
          <circle cx="162" cy="107" r="25" fill="#273C36" />
          <path d="M150 107L159 115L175 98" stroke="#FFF6EA" strokeWidth="3" />
          <path d="M39 65H64M51.5 52.5V77.5" stroke="#273C36" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
