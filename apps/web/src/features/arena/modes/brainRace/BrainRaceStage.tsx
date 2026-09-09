import { useRef } from 'react';
import { ActivityFeed } from './ActivityFeed';
import { RaceQuestionPanel } from './RaceQuestionPanel';
import { RaceTeamPanel } from './RaceTeamPanel';
import { RaceTrack } from './RaceTrack';
import { useRaceMotion } from './useRaceMotion';
import './race.css';

/**
 * The Brain Race classroom stage. The track is the visual hero; the shared
 * question sits under it, flanked by the two team panels.
 */
export function BrainRaceStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useRaceMotion(rootRef);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-[3] shrink-0">
        <RaceTrack />
      </div>
      <div className="flex min-h-0 flex-[2] gap-3">
        <RaceTeamPanel teamId="blue" terminalNumber={1} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <RaceQuestionPanel />
          <ActivityFeed />
        </div>
        <RaceTeamPanel teamId="red" terminalNumber={2} />
      </div>
    </div>
  );
}
