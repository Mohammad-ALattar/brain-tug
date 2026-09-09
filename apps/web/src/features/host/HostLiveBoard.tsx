import type { ReactNode } from 'react';

import type { GameModeId, GameSession, ModeState, TeamId } from '@braintug/shared';

import { displayLeadGapMetres, displayLeader, displayTeamFinishers } from '@braintug/shared';

import { TEAM_THEME } from '../../design/teamTheme';

import { copyFor, copyForState } from '../arena/modeCopy';

import {
  useBrainRaceFinishers,
  useGameMode,
  useModeState,
  usePlayers,
  useQuestionIndex,
  useTeamName,
  useTeamScore,
  useTeamStreak,
  useTotalQuestions,
} from '../../store/selectors';
import { useGameStore } from '../../store/gameStore';



/**

 * A compact repeat of what the class is watching, so a teacher facing the room

 * does not have to turn around to see the state of the match.

 */

export function HostLiveBoard() {

  const index = useQuestionIndex();

  const total = useTotalQuestions();

  const players = usePlayers();

  const mode = useGameMode();

  const modeState = useModeState();

  const state = useGameStore((s) => s.state);



  return (

    <section className="bt-panel p-4">

      <div className="flex items-baseline justify-between">

        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">

          Live

        </h2>

        <p className="tabular text-xs font-bold text-ink-muted">

          {index >= 0 ? `Question ${index + 1} of ${total}` : `${total} questions`}

        </p>

      </div>



      <div className="mt-3 grid grid-cols-2 gap-3">

        <TeamTile teamId="blue" />

        <TeamTile teamId="red" />

      </div>



      <p className="mt-3 text-center text-xs font-bold text-ink-muted">

        {leadCopy(mode, modeState, state)}

      </p>



      <p className="mt-1 text-center text-[11px] font-semibold text-ink-faint">

        {players.filter((p) => p.connected).length} of {players.length} devices connected

      </p>

    </section>

  );

}



function finishersSessionSlice(

  view: NonNullable<ReturnType<typeof useGameStore.getState>['state']>,

): Pick<GameSession, 'teams' | 'players'> {

  return {

    teams: view.teams,

    players: Object.fromEntries(view.players.map((player) => [player.id, player])) as GameSession['players'],

  };

}



function leadCopy(

  mode: GameModeId,

  modeState: ModeState | null,

  state: ReturnType<typeof useGameStore.getState>['state'],

): ReactNode {

  const copy = modeState ? copyForState(modeState) : copyFor(mode);

  if (!modeState || !state) return copy.level;



  if (mode === 'brain_race' && modeState.kind === 'brain_race') {

    const sessionSlice = finishersSessionSlice(state);

    const blue = displayTeamFinishers(

      modeState,

      sessionSlice as GameSession,

      'blue',

      state.rules.winThreshold,

    );

    const red = displayTeamFinishers(

      modeState,

      sessionSlice as GameSession,

      'red',

      state.rules.winThreshold,

    );



    if (blue.finished === red.finished) return copy.level;



    const leader: TeamId = blue.finished > red.finished ? 'blue' : 'red';

    const gap = Math.abs(blue.finished - red.finished);

    const leaderName = leader === 'blue' ? state.teams.blue.name : state.teams.red.name;



    return (

      <>

        <span className={TEAM_THEME[leader].text}>{leaderName}</span> ahead by{' '}

        <span className="tabular">

          {gap} finisher{gap === 1 ? '' : 's'}

        </span>

      </>

    );

  }



  const leader = displayLeader(modeState);

  if (leader === null) return copy.level;



  const metres = displayLeadGapMetres(modeState);

  return (

    <>

      <span className={TEAM_THEME[leader].text}>{leader === 'blue' ? 'Blue' : 'Red'}</span> ahead

      by <span className="tabular">{metres.toFixed(copy.gapDigits)}m</span>

    </>

  );

}



function TeamTile({ teamId }: { teamId: TeamId }) {
  const theme = TEAM_THEME[teamId];
  const mode = useGameMode();
  const name = useTeamName(teamId);
  const finishers = useBrainRaceFinishers(teamId);
  const correctCount = useGameStore((s) => s.state?.teams[teamId].correctCount ?? 0);
  const score = useTeamScore(teamId);
  const streak = useTeamStreak(teamId);

  if (mode === 'brain_race') {
    return (
      <div className={`rounded-card border ${theme.border} ${theme.tint} px-3 py-2.5`}>
        <p className={`truncate text-xs font-extrabold ${theme.textStrong}`}>{name}</p>
        <p className={`tabular font-display text-3xl font-extrabold leading-none ${theme.text}`}>
          {finishers.finished}
          <span className="text-xl text-ink-muted"> / {finishers.required}</span>
        </p>
        <p className="tabular mt-0.5 text-[11px] font-bold text-ink-faint">
          {correctCount} correct {correctCount === 1 ? 'answer' : 'answers'}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-card border ${theme.border} ${theme.tint} px-3 py-2.5`}>
      <p className={`truncate text-xs font-extrabold ${theme.textStrong}`}>{name}</p>
      <p className={`tabular font-display text-3xl font-extrabold leading-none ${theme.text}`}>
        {score}
      </p>
      <p className="tabular mt-0.5 text-[11px] font-bold text-ink-faint">streak {streak}</p>
    </div>
  );
}


