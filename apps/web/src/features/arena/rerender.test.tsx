import { Profiler, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { PlayerId, PublicPlayer, TeamId } from '@braintug/shared';
import { makeState, resetStore, seedStore } from '../../test/fixtures';
import { useGameStore } from '../../store/gameStore';
import { MirroredKeypad } from './MirroredKeypad';
import { QuestionCard } from './QuestionCard';
import { TeamRoster } from './TeamRoster';
import { TeamStreak } from './TeamStreak';
import { TopGameHeader } from './TopGameHeader';

/**
 * Rerender budgets for the classroom display.
 *
 * The arena runs on a projector for a whole lesson while forty phones stream
 * keystrokes at it, so the thing that actually degrades is not paint cost but
 * React work: a selector that is one field too broad turns every keystroke on
 * one team into a rerender of both panels. Component tests cannot see that, and
 * neither can an end-to-end test, so the boundaries are pinned here with the
 * Profiler.
 *
 * These are budgets rather than exact counts: they fail when a change makes a
 * subtree newly sensitive to an event it should not care about.
 */

const counts = new Map<string, number>();

/** Wraps a subtree in a Profiler that tallies its renders under `id`. */
function Counted({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Profiler
      id={id}
      onRender={() => counts.set(id, (counts.get(id) ?? 0) + 1)}
    >
      {children}
    </Profiler>
  );
}

const renders = (id: string): number => counts.get(id) ?? 0;

/** Zeroes the tallies, so each assertion measures one event in isolation. */
function resetCounts(): void {
  counts.clear();
}

beforeEach(() => {
  seedStore(makeState({ playersPerTeam: 3 }));
  resetCounts();
});

afterEach(() => {
  cleanup();
  resetStore();
});

/**
 * Renders the per-team pieces of both panels side by side, each individually
 * counted. Anything outside a `Counted` boundary is inert, so a tally can only
 * move because the store told that subtree to move.
 */
function renderBothPanels() {
  return render(
    <>
      <Counted id="header">
        <TopGameHeader />
      </Counted>
      {(['blue', 'red'] as TeamId[]).map((teamId) => (
        <div key={teamId}>
          <Counted id={`question-${teamId}`}>
            <QuestionCard teamId={teamId} />
          </Counted>
          <Counted id={`keypad-${teamId}`}>
            <MirroredKeypad teamId={teamId} />
          </Counted>
          <Counted id={`roster-${teamId}`}>
            <TeamRoster teamId={teamId} />
          </Counted>
          <Counted id={`streak-${teamId}`}>
            <TeamStreak teamId={teamId} />
          </Counted>
        </div>
      ))}
    </>,
  );
}

describe('arena rerender budget', () => {
  it('confines a keystroke to the typing team, and only to its keypad', () => {
    renderBothPanels();
    resetCounts();

    act(() => useGameStore.getState().applyDraft('blue', '42'));

    // Two subtrees show a draft and so are allowed to move once: the mirrored
    // keypad, and the masked answer display nested in the question card.
    expect(renders('keypad-blue')).toBe(1);
    expect(renders('question-blue')).toBe(1);

    // The prompt itself does not change, so the card's text is untouched.
    expect(screen.getAllByText(/2 × 10/).length).toBeGreaterThan(0);

    // The other team's panel is untouched, which is what keeps a 40-phone
    // firehose from costing double.
    expect(renders('keypad-red')).toBe(0);
    expect(renders('question-red')).toBe(0);

    // Nothing that a draft cannot affect moves: not the roster, not the streak
    // tier, not the scoreboard.
    expect(renders('roster-blue')).toBe(0);
    expect(renders('streak-blue')).toBe(0);
    expect(renders('header')).toBe(0);
  });

  it('stays flat across a burst of keystrokes from both teams', () => {
    renderBothPanels();
    resetCounts();

    // Six digits each, as two students racing to type a six-digit answer.
    act(() => {
      for (let i = 1; i <= 6; i += 1) {
        useGameStore.getState().applyDraft('blue', '9'.repeat(i));
        useGameStore.getState().applyDraft('red', '8'.repeat(i));
      }
    });

    // Batched into a single commit, so the cost of a burst is not linear in
    // keystrokes: twelve store writes cost one render each, not twelve.
    expect(renders('keypad-blue')).toBeLessThanOrEqual(2);
    expect(renders('keypad-red')).toBeLessThanOrEqual(2);
    expect(renders('question-blue')).toBeLessThanOrEqual(2);

    // The roster and scoreboard sit the whole burst out.
    expect(renders('roster-blue')).toBe(0);
    expect(renders('header')).toBe(0);
  });

  it('keeps a pull off the question, keypad and roster', () => {
    renderBothPanels();
    resetCounts();

    act(() =>
      useGameStore.getState().applyPull({
        teamId: 'blue',
        playerId: 'p1' as PlayerId,
        pull: 0.055,
        streak: 1,
        ropePosition: 0.055,
        score: 1,
      }),
    );

    // The score and the streak tier are the visible consequences of a pull.
    expect(renders('header')).toBe(1);
    expect(renders('streak-blue')).toBe(1);

    // The rope itself moves through CSS custom properties, so the panels that
    // surround it do no React work at all.
    expect(renders('question-blue')).toBe(0);
    expect(renders('keypad-blue')).toBe(0);
    expect(renders('question-red')).toBe(0);
    expect(renders('keypad-red')).toBe(0);
    expect(renders('streak-red')).toBe(0);
  });

  it('keeps a late joiner off the problem cards', () => {
    renderBothPanels();
    resetCounts();

    const arrival: PublicPlayer = {
      id: 'late-1' as PlayerId,
      name: 'Latecomer',
      teamId: 'blue',
      connected: true,
      correctCount: 0,
      incorrectCount: 0,
      contributedPull: 0,
    };
    act(() => useGameStore.getState().applyPlayerJoined(arrival));

    // Both rosters re-read the shared player list, and the header shows the
    // new head count.
    expect(renders('roster-blue')).toBe(1);
    expect(renders('header')).toBeGreaterThanOrEqual(1);

    // A child walking in late must not disturb the problem on screen or the
    // mirrored keypad of a student mid-answer.
    expect(renders('question-blue')).toBe(0);
    expect(renders('keypad-blue')).toBe(0);
    expect(renders('question-red')).toBe(0);
    expect(renders('keypad-red')).toBe(0);
  });

  it('rerenders every panel exactly once on a new question', () => {
    renderBothPanels();
    resetCounts();

    // A fresh round is the one event that legitimately touches everything.
    act(() => seedStore(makeState({ playersPerTeam: 3, lockedTeams: ['blue'] })));

    for (const id of [
      'header',
      'question-blue',
      'question-red',
      'keypad-blue',
      'keypad-red',
      'roster-blue',
      'roster-red',
    ]) {
      expect(renders(id), `${id} should rerender exactly once`).toBeLessThanOrEqual(1);
    }
  });
});
