import { useRef, useState } from 'react';
import type { HostToken } from '@braintug/shared';
import { ScaledCanvas } from '../../components/ScaledCanvas';
import { unlockAudio } from '../../audio/sfx';
import { useArenaAudio } from '../../audio/useArenaAudio';
import { Countdown } from './Countdown';
import { useArenaMotion } from './useArenaMotion';
import { TeacherControlBar } from './TeacherControlBar';
import { TeamPanel } from './TeamPanel';
import { TopGameHeader } from './TopGameHeader';
import { TugOfWarArena } from './TugOfWarArena';
import { VictoryScreen } from './VictoryScreen';

export type GameArenaProps = {
  hostToken: HostToken | null;
};

/**
 * The classroom display, authored against the 1920x1080 reference and scaled to
 * whatever the projector is. Three columns: blue terminal, arena, red terminal.
 */
export function GameArena({ hostToken }: GameArenaProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Both of these subscribe to the store imperatively, so neither a pull nor a
  // sound effect causes this component or its children to rerender.
  useArenaMotion(rootRef);
  useArenaAudio(audioEnabled);

  return (
    <ScaledCanvas>
      <div ref={rootRef} className="relative flex h-full w-full flex-col gap-3 bg-paper p-4">
        <TopGameHeader />

        <div className="flex min-h-0 flex-1 gap-3">
          <TeamPanel teamId="blue" terminalNumber={1} />
          <TugOfWarArena />
          <TeamPanel teamId="red" terminalNumber={2} />
        </div>

        <TeacherControlBar
          hostToken={hostToken}
          audioEnabled={audioEnabled}
          onToggleAudio={() => {
            // Unlocked straight from the click: browsers only start an audio
            // context inside a user gesture, and an effect is already too late.
            if (!audioEnabled) unlockAudio();
            setAudioEnabled((on) => !on);
          }}
        />

        <Countdown />
        <VictoryScreen />
      </div>
    </ScaledCanvas>
  );
}
