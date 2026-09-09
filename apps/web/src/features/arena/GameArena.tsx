import { useState } from 'react';
import type { HostToken } from '@braintug/shared';
import { ScaledCanvas } from '../../components/ScaledCanvas';
import { unlockAudio } from '../../audio/sfx';
import { useArenaAudio } from '../../audio/useArenaAudio';
import { useGameMode } from '../../store/selectors';
import { Countdown } from './shell/Countdown';
import { TeacherControlBar } from './shell/TeacherControlBar';
import { TopGameHeader } from './shell/TopGameHeader';
import { VictoryScreen } from './shell/VictoryScreen';
import { ARENA_STAGE } from './modes/registry';

export type GameArenaProps = {
  hostToken: HostToken | null;
};

/**
 * The classroom display, authored against the 1920x1080 reference and scaled to
 * whatever the projector is. Shared chrome around a mode-specific stage.
 */
export function GameArena({ hostToken }: GameArenaProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const mode = useGameMode();
  const Stage = ARENA_STAGE[mode];

  useArenaAudio(audioEnabled);

  return (
    <ScaledCanvas>
      <div className="relative flex h-full w-full flex-col gap-3 bg-paper p-4">
        <TopGameHeader />
        <Stage />
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
