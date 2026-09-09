import { afterEach, describe, expect, it } from 'vitest';

import { act, render, screen, cleanup } from '@testing-library/react';

import type { GameStateView, PlayerId, PublicQuestion, QuestionId } from '@braintug/shared';

import { makeState, playerOn, resetStore, seedStore } from '../../../../test/fixtures';

import { useGameStore } from '../../../../store/gameStore';

import { AnswerFeedback } from '../../../student/AnswerFeedback';

import { StudentController } from '../../../student/StudentController';

import { StudentRaceStrip } from '../../../student/StudentRaceStrip';

import { ActivityFeed } from './ActivityFeed';

import { BrainRaceStage } from './BrainRaceStage';

import { laneHeightPx } from './racePresentation';

import { TopGameHeader } from '../../shell/TopGameHeader';

import { RaceGainFlash } from './RaceGainFlash';

import { RaceQuestionPanel } from './RaceQuestionPanel';

import { RaceRoundNotice } from './RaceRoundNotice';

import { RaceTrack } from './RaceTrack';



afterEach(() => {

  cleanup();

  resetStore();

});



function raceModeState(

  state: GameStateView,

  progressOverrides: Partial<Record<PlayerId, number>> = {},

) {

  const progress = Object.fromEntries(

    state.players.map((player) => [player.id, progressOverrides[player.id] ?? 0]),

  ) as Record<PlayerId, number>;



  return {

    kind: 'brain_race' as const,

    progress,

    trackMetres: 1000,

    finishersRequiredPerTeam: 1,

    finishOrder: [],

  };

}



function seedRace(progressOverrides: Partial<Record<PlayerId, number>> = {}) {

  const state = makeState({ mode: 'brain_race' });

  seedStore({

    ...state,

    modeState: raceModeState(state, progressOverrides),

  });

  return state;

}



describe('BrainRaceStage', () => {

  it('renders one lane per seated player with individual metres', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    act(() => {

      useGameStore.getState().setState({

        ...useGameStore.getState().state!,

        modeState: raceModeState(state, { [blue.id]: 0.25, [red.id]: 0.5 }),

      });

    });



    render(<BrainRaceStage />);



    expect(screen.getByLabelText(new RegExp(`${blue.name} 250 metres of 1000`, 'i'))).toBeDefined();

    expect(screen.getByLabelText(new RegExp(`${red.name} 500 metres of 1000`, 'i'))).toBeDefined();

  });



  it('positions racers from CSS custom properties, never an inline transform', () => {

    seedRace();

    const { container } = render(<BrainRaceStage />);



    const racers = container.querySelectorAll('.bt-racer-slot');

    expect(racers.length).toBeGreaterThan(0);

    for (const racer of racers) {

      expect((racer as HTMLElement).style.transform).toBe('');

    }

    expect(container.querySelector('[style*="translateX("]')).toBeNull();

  });



  it('keeps race positions correct after a reconnect snapshot', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    act(() => {

      useGameStore.getState().setState({

        ...useGameStore.getState().state!,

        modeState: raceModeState(state, { [blue.id]: 0.35, [red.id]: 0.1 }),

      });

    });

    const { container } = render(<BrainRaceStage />);



    act(() => {

      const current = useGameStore.getState().state!;

      useGameStore.getState().setState({

        ...current,

        modeState: raceModeState(current, { [blue.id]: 0.42, [red.id]: 0.18 }),

      });

    });



    expect(screen.getByLabelText(new RegExp(`${blue.name} 420 metres of 1000`, 'i'))).toBeDefined();

    expect(screen.getByLabelText(new RegExp(`${red.name} 180 metres of 1000`, 'i'))).toBeDefined();

    expect(container.querySelector('[style*="translateX("]')).toBeNull();

  });

});



describe('RaceGainFlash', () => {

  it('shows player name, team, and distance after a correct answer', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    render(<RaceTrack />);



    act(() =>

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: player.id,

        gain: 0.16,

        streak: 1,

        score: 4,

        modeState: raceModeState(state, { [player.id]: 0.16 }),

      }),

    );



    const flash = screen.getByRole('status');

    expect(flash.textContent).toContain(player.name);

    expect(flash.textContent).toContain('Blue Tigers');

    expect(flash.textContent).not.toContain('4 correct answers');

    expect(flash.textContent).toContain('+160m');

  });



  it('does not replay the last gain after reconnecting mid-match', () => {

    seedRace();

    useGameStore.setState({

      lastProgress: {

        key: 99,

        teamId: 'blue',

        playerId: 'p1' as PlayerId,

        gain: 0.05,

        streak: 1,

        score: 3,

      },

    });



    render(<RaceGainFlash />);

    expect(screen.queryByText('+50m')).toBeNull();

  });



  it('clears when the round resolves', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<RaceTrack />);



    act(() =>

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: player.id,

        gain: 0.04,

        streak: 1,

        score: 2,

        modeState: raceModeState(state, { [player.id]: 0.14, [red.id]: 0.2 }),

      }),

    );



    expect(screen.getByText('+40m')).toBeDefined();



    act(() =>

      useGameStore.getState().applyResolution(state.currentQuestionIndex, 'timeout', {

        blue: '20',

        red: '20',

      }),

    );



    expect(screen.queryByText('+40m')).toBeNull();

  });

});



describe('RaceQuestionPanel', () => {

  function withQuestion(question: PublicQuestion) {

    const state = makeState({ mode: 'brain_race' });

    seedStore({

      ...state,

      modeState: raceModeState(state),

      currentQuestion: { blue: question, red: question },

    });

    return state;

  }



  it('renders multiple-choice options as a non-interactive list', () => {

    withQuestion({

      id: 'mc1' as QuestionId,

      subject: 'science',

      difficulty: 'easy',

      type: 'multiple_choice',

      prompt: 'Which planet is known as the Red Planet?',

      options: [

        { id: 'a', text: 'Mars' },

        { id: 'b', text: 'Earth' },

        { id: 'c', text: 'Venus' },

        { id: 'd', text: 'Jupiter' },

      ],

    });



    const { container } = render(<RaceQuestionPanel />);

    expect(screen.getByText(/which planet/i)).toBeDefined();

    expect(screen.getByText('Mars')).toBeDefined();

    expect(container.textContent).not.toMatch(/=\s*\?/);

    expect(container.querySelectorAll('button')).toHaveLength(0);

  });



  it('labels a true/false prompt without turning it into an equation', () => {

    withQuestion({

      id: 'tf1' as QuestionId,

      subject: 'science',

      difficulty: 'easy',

      type: 'true_false',

      prompt: 'The Sun is a star.',

    });



    const { container } = render(<RaceQuestionPanel />);

    expect(screen.getByText(/the sun is a star/i)).toBeDefined();

    expect(screen.getByText(/true or false/i)).toBeDefined();

    expect(container.textContent).not.toMatch(/=\s*\?/);

  });



  it('renders a numeric typed-answer prompt as an equation', () => {

    withQuestion({

      id: 'ta1' as QuestionId,

      subject: 'math',

      difficulty: 'easy',

      type: 'type_answer',

      inputMode: 'number',

      prompt: '2 × 10',

    });



    const { container } = render(<RaceQuestionPanel />);

    expect(container.textContent).toMatch(/2 × 10\s*=\s*\?/);

  });



  it('renders a text typed-answer prompt without an equation', () => {

    withQuestion({

      id: 'ta2' as QuestionId,

      subject: 'english',

      difficulty: 'easy',

      type: 'type_answer',

      inputMode: 'text',

      prompt: 'Name the process plants use to make food.',

    });



    const { container } = render(<RaceQuestionPanel />);

    expect(screen.getByText(/plants use to make food/i)).toBeDefined();

    expect(container.textContent).not.toMatch(/=\s*\?/);

  });



  it('shows answer progress from the server round state', () => {

    const state = withQuestion({

      id: 'mc1' as QuestionId,

      subject: 'science',

      difficulty: 'easy',

      type: 'multiple_choice',

      prompt: 'Pick one',

      options: [{ id: 'a', text: 'A' }],

    });



    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    seedStore({

      ...state,

      round: {

        ...state.round!,

        teams: {

          ...state.round!.teams,

          blue: { ...state.round!.teams.blue, attemptedPlayerIds: [blue.id] },

          red: { ...state.round!.teams.red, attemptedPlayerIds: [red.id] },

        },

      },

    });



    render(<RaceQuestionPanel />);

    expect(screen.getByText('2 / 4 answered')).toBeDefined();

  });

});



describe('RaceRoundNotice', () => {

  it('shows when the current round resolves and clears on the next question', () => {

    const state = seedRace();

    render(<RaceRoundNotice />);



    act(() =>

      useGameStore.getState().applyResolution(state.currentQuestionIndex, 'timeout', {

        blue: '20',

        red: '20',

      }),

    );



    expect(screen.getByText(/time's up/i)).toBeDefined();

    expect(screen.getByText(/next question coming/i)).toBeDefined();



    act(() => {

      const current = useGameStore.getState().state!;

      useGameStore.setState({

        state: { ...current, currentQuestionIndex: current.currentQuestionIndex + 1 },

      });

    });



    expect(screen.queryByText(/time's up/i)).toBeNull();

  });

});



describe('ActivityFeed', () => {

  it('stays empty until a correct answer, then lists the gain locally', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<ActivityFeed />);



    expect(screen.getByText(/waiting for the first correct answer/i)).toBeDefined();



    act(() => {

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: player.id,

        gain: 0.04,

        streak: 1,

        score: 1,

        modeState: raceModeState(state, { [player.id]: 0.24, [red.id]: 0.45 }),

      });

    });



    expect(screen.getByText(player.name)).toBeDefined();

    expect(screen.getByText('Blue Tigers')).toBeDefined();

    expect(screen.getByText(/\+40m/)).toBeDefined();

    expect(screen.queryByText(/waiting for the first correct answer/i)).toBeNull();

  });



  it('lists multiple consecutive gains', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<ActivityFeed />);



    act(() =>

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: blue.id,

        gain: 0.04,

        streak: 1,

        score: 1,

        modeState: raceModeState(state, { [blue.id]: 0.04 }),

      }),

    );

    act(() =>

      useGameStore.getState().applyProgress({

        teamId: 'red',

        playerId: red.id,

        gain: 0.03,

        streak: 1,

        score: 1,

        modeState: raceModeState(state, { [blue.id]: 0.04, [red.id]: 0.03 }),

      }),

    );



    expect(screen.getByText('+40m')).toBeDefined();

    expect(screen.getByText('+30m')).toBeDefined();

  });

});



describe('RaceStreakFlash', () => {

  it('shows a classroom streak callout from the authoritative progress event', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<RaceTrack />);



    act(() => {

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: player.id,

        gain: 0.04,

        streak: 3,

        score: 3,

        modeState: raceModeState(state, { [player.id]: 0.14, [red.id]: 0.2 }),

      });

    });



    expect(screen.getByText(/🔥 3 streak/i)).toBeDefined();

    expect(screen.getByText(/is on fire!/i)).toBeDefined();

  });



  it('does not announce streaks below the strong threshold', () => {

    seedRace();

    render(<RaceTrack />);



    act(() => {

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: 'p1' as PlayerId,

        gain: 0.04,

        streak: 2,

        score: 2,

        modeState: {

          kind: 'brain_race',

          progress: { ['p1' as PlayerId]: 0.14 },

          trackMetres: 1000,

          finishersRequiredPerTeam: 1,

          finishOrder: [],

        },

      });

    });



    expect(screen.queryByText(/streak/i)).toBeNull();

  });



  it('does not replay streak feedback after reconnecting with a stale progress key', () => {

    const state = seedRace();

    const player = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<RaceTrack />);



    act(() => {

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: player.id,

        gain: 0.04,

        streak: 4,

        score: 4,

        modeState: raceModeState(state, { [player.id]: 0.39, [red.id]: 0.1 }),

      });

    });



    expect(screen.getByText(/🔥 4 streak/i)).toBeDefined();

    cleanup();

    resetStore();



    seedStore({

      ...state,

      modeState: raceModeState(state, { [player.id]: 0.39, [red.id]: 0.1 }),

    });

    useGameStore.setState({

      lastProgress: {

        key: 99,

        teamId: 'blue',

        playerId: player.id,

        gain: 0.04,

        streak: 4,

        score: 4,

      },

    });



    render(<RaceTrack />);

    expect(screen.queryByText(/🔥 4 streak/i)).toBeNull();

  });

});



describe('RaceStreakFlash reconnect snapshot', () => {

  it('restores player streak from the server snapshot without faking a flash', () => {

    const state = makeState({ mode: 'brain_race' });

    const player = playerOn(state, 'blue', 0);

    seedStore({

      ...state,

      players: state.players.map((entry) =>

        entry.id === player.id ? { ...entry, streak: 3 } : entry,

      ),

      modeState: raceModeState(state, { [player.id]: 0.2 }),

    });



    render(<RaceTrack />);

    expect(screen.queryByText(/🔥 3 streak/i)).toBeNull();

    expect(useGameStore.getState().state!.players.find((p) => p.id === player.id)!.streak).toBe(3);

  });

});



describe('student incorrect feedback in Brain Race', () => {

  it('shows incorrect feedback without implying the round ended', () => {

    seedStore(makeState({ mode: 'brain_race' }));

    render(

      <AnswerFeedback

        outcome={{

          status: 'incorrect',

          questionId: 'q' as QuestionId,

          elapsedMs: 800,

        }}

      />,

    );



    expect(screen.getByText(/^incorrect$/i)).toBeDefined();

    expect(screen.getByText(/streak reset/i)).toBeDefined();

    expect(screen.queryByText(/wait for the next question/i)).toBeNull();

  });



  it('shows the player streak after a strong run', () => {

    seedStore(makeState({ mode: 'brain_race' }));

    render(

      <AnswerFeedback

        outcome={{

          status: 'correct',

          questionId: 'q' as QuestionId,

          gain: 0.04,

          points: 1,

          streak: 3,

          elapsedMs: 500,

        }}

      />,

    );



    expect(screen.getByText(/correct!/i)).toBeDefined();

    expect(screen.getByText(/your racer moved/i)).toBeDefined();

    expect(screen.getByText(/🔥 3 streak/i)).toBeDefined();

  });



  it('keeps the student spent while others can still answer', () => {

    const state = makeState({ mode: 'brain_race', wrongAttempts: [['blue', 0]] });

    const me = playerOn(state, 'blue', 0);

    seedStore(state, { playerId: me.id, teamId: 'blue' });



    render(<StudentController teamId="blue" playerName={me.name} onLeave={() => undefined} />);



    expect(screen.getByText(/you're done for this question/i)).toBeDefined();

    expect(screen.getByText(/others can still answer/i)).toBeDefined();

  });

});



describe('race presentation polish', () => {

  it('marks the individual leader on the track', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    act(() => {

      useGameStore.getState().setState({

        ...useGameStore.getState().state!,

        modeState: raceModeState(state, { [blue.id]: 0.5, [red.id]: 0.2 }),

      });

    });



    render(<RaceTrack />);

    expect(screen.getByText('Leading')).toBeDefined();

  });



  it('shows an overtake cue when a gain passes another racer', () => {

    const state = seedRace();

    const blue = playerOn(state, 'blue', 0);

    const red = playerOn(state, 'red', 0);

    render(<RaceTrack />);



    act(() =>

      useGameStore.getState().applyProgress({

        teamId: 'blue',

        playerId: blue.id,

        gain: 0.06,

        streak: 1,

        score: 1,

        modeState: raceModeState(state, { [blue.id]: 0.5, [red.id]: 0.45 }),

      }),

    );



    expect(screen.getByText('Overtake')).toBeDefined();

  });



  it('uses compact lane heights for large rosters', () => {

    expect(laneHeightPx(2)).toBe(72);

    expect(laneHeightPx(10)).toBe(48);

  });

});



describe('TopGameHeader in Brain Race', () => {

  it('shows correct answers and finishers instead of tug score labels', () => {

    seedStore(makeState({ mode: 'brain_race' }));

    render(<TopGameHeader />);



    expect(screen.getAllByText(/correct/i).length).toBeGreaterThan(0);

    expect(screen.getAllByText(/finishers/i).length).toBeGreaterThan(0);

    expect(screen.queryAllByText(/^score$/i).length).toBe(0);

  });

});



describe('StudentRaceStrip', () => {

  it('shows personal metres without a leaderboard', () => {

    const state = makeState({ mode: 'brain_race' });

    const me = playerOn(state, 'blue', 0);

    seedStore(

      {

        ...state,

        modeState: raceModeState(state, { [me.id]: 0.25 }),

      },

      { playerId: me.id, teamId: 'blue' },

    );



    render(<StudentRaceStrip teamId="blue" playerName={me.name} />);



    expect(screen.getByText(me.name)).toBeDefined();

    expect(screen.getByText(/250m/i)).toBeDefined();

    expect(screen.getByText(/1000m/i)).toBeDefined();

    expect(screen.queryByText(/leading/i)).toBeNull();

  });

});


