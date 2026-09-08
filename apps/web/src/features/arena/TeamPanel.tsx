import { memo } from 'react';
import type { TeamId } from '@mtow/shared';
import { MirroredKeypad } from './MirroredKeypad';
import { QuestionCard } from './QuestionCard';
import { TeamHeader } from './TeamHeader';
import { TeamRoster } from './TeamRoster';
import { TeamStreak } from './TeamStreak';

export type TeamPanelProps = {
  teamId: TeamId;
  terminalNumber: number;
};

/**
 * One side column of the arena. Purely compositional: every child subscribes to
 * its own slice of state, so a keystroke mirrored into the keypad does not
 * rerender the roster or the question card.
 */
export const TeamPanel = memo(function TeamPanel({ teamId, terminalNumber }: TeamPanelProps) {
  return (
    <aside
      // The streak glow deepens by tier, driven by `--streak-*` rather than a
      // subscription, so a rising streak never rerenders this column.
      className={`mtow-panel mtow-streak-${teamId} flex h-full w-[404px] shrink-0 flex-col gap-3 p-4`}
    >
      <TeamHeader teamId={teamId} terminalNumber={terminalNumber} />
      <TeamStreak teamId={teamId} />
      <QuestionCard teamId={teamId} />
      <MirroredKeypad teamId={teamId} />
      <div className="mt-auto border-t border-paper-line pt-3">
        <TeamRoster teamId={teamId} />
      </div>
    </aside>
  );
});
