import { useEffect, useState } from 'react';

import { TEAM_THEME } from '../../../../design/teamTheme';

import { useGameStore } from '../../../../store/gameStore';

import {

  useLastProgress,

  useLastResolution,

  usePlayers,

  useQuestionIndex,

  useTeamName,

} from '../../../../store/selectors';

import { useRaceModeState } from './selectors';

import { formatRaceGainPresentation } from './raceFeedback';



/**

 * The projector-sized gain card shown when a player scores.

 *

 * Reads the authoritative `progress_applied` flash, then gets out of the way

 * once the round closes or a newer gain arrives.

 */

export function RaceGainFlash() {

  const flash = useLastProgress();

  const race = useRaceModeState();

  const players = usePlayers();

  const resolution = useLastResolution();

  const questionIndex = useQuestionIndex();

  const blueName = useTeamName('blue');

  const redName = useTeamName('red');

  const [dismissedKey, setDismissedKey] = useState<number | null>(

    () => useGameStore.getState().lastProgress?.key ?? null,

  );



  useEffect(() => {

    if (resolution && resolution.index === questionIndex) {

      setDismissedKey(flash?.key ?? null);

    }

  }, [resolution, questionIndex, flash?.key]);



  if (!flash || !race || dismissedKey === flash.key) return null;

  if (resolution && resolution.index === questionIndex) return null;



  const player = players.find((entry) => entry.id === flash.playerId);

  const presentation = formatRaceGainPresentation({

    flash,

    playerName: player?.name ?? 'Player',

    teamName: flash.teamId === 'blue' ? blueName : redName,

    modeState: race,

  });

  const theme = TEAM_THEME[presentation.teamId];



  return (

    <div

      key={flash.key}

      role="status"

      aria-live="polite"

      className="pointer-events-none absolute right-4 top-4 z-20 animate-[raceGainPop_0.45s_ease-out_both]"

    >

      <div

        className={`min-w-[220px] rounded-panel border-2 border-white/70 px-5 py-4 text-center shadow-panel ${theme.solid}`}

      >

        <p className="font-display text-lg font-extrabold uppercase tracking-[0.12em] text-white">

          {presentation.playerName}

        </p>

        <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-white/80">

          {presentation.teamName}

        </p>

        <p className="tabular mt-2 font-display text-4xl font-extrabold leading-none text-white">

          {presentation.metresLabel}

        </p>

      </div>

    </div>

  );

}


