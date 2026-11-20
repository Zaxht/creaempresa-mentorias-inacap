import {
  ArrowUpRight,
  Check,
  MessageCircle,
  Lightbulb,
  UsersRound,
  ChartNoAxesCombined,
  Layers3,
} from 'lucide-react';

// Vector artwork stays sharp at every size and does not imply real participants.
export function ProgramGraphic({
  variant = 'people',
  compact = false,
}: {
  variant?: 'people' | 'progress' | 'reports';
  compact?: boolean;
}) {
  const Icon =
    variant === 'reports'
      ? Layers3
      : variant === 'progress'
        ? ChartNoAxesCombined
        : UsersRound;
  return (
    <div
      className={`program-graphic ${compact ? 'graphic-compact' : ''}`}
      aria-hidden="true"
    >
      <div className="graphic-orbit orbit-one" />
      <div className="graphic-orbit orbit-two" />
      <div className="graphic-card graphic-card-back">
        <span />
        <span />
        <span />
      </div>
      <div className="graphic-card graphic-card-front">
        <div className="graphic-symbol">
          <Icon size={30} strokeWidth={1.5} />
        </div>
        <div className="graphic-lines">
          <span />
          <span />
        </div>
        <span className="graphic-check">
          <Check size={12} />
        </span>
      </div>
      <span className="graphic-satellite satellite-one">
        <Lightbulb size={18} />
      </span>
      <span className="graphic-satellite satellite-two">
        <MessageCircle size={18} />
      </span>
      <span className="graphic-satellite satellite-three">
        <ArrowUpRight size={18} />
      </span>
    </div>
  );
}
