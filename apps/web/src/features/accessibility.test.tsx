import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { TeamId } from '@mtow/shared';
import { makeState, playerOn, resetStore, seedStore } from '../test/fixtures';
import { StudentJoinForm } from './student/StudentJoinForm';
import { StudentController } from './student/StudentController';
import { CreateGameForm } from './host/CreateGameForm';
import { TopGameHeader } from './arena/TopGameHeader';
import { NumericKeypad } from './student/NumericKeypad';

/**
 * Accessibility guarantees for the three surfaces.
 *
 * These are the properties that make the game usable with a screen reader, a
 * keyboard, or without relying on colour. They are easy to break by accident
 * while restyling and none of them show up in a visual review, so each one is
 * asserted rather than left to a one-off audit.
 */

afterEach(() => {
  cleanup();
  resetStore();
});

/** Seeds the store as a joined blue student and returns their name. */
function seatBlueStudent(options = {}) {
  const state = makeState(options);
  const me = playerOn(state, 'blue');
  seedStore(state, { playerId: me.id, teamId: 'blue' });
  return me.name;
}

describe('landmarks', () => {
  it('gives the student join screen a main region', () => {
    render(<StudentJoinForm onJoin={vi.fn()} busy={false} error={null} />);
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('gives the teacher setup screen a main region under a first-level heading', () => {
    render(<CreateGameForm onCreate={vi.fn()} busy={false} error={null} />);
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: /new match/i })).toBeTruthy();
  });

  it('gives the student controller a main region', () => {
    const name = seatBlueStudent();
    render(<StudentController teamId="blue" playerName={name} onLeave={vi.fn()} />);
    expect(screen.getByRole('main')).toBeTruthy();
  });
});

describe('naming and labelling', () => {
  it('names every key on the student keypad', () => {
    render(<NumericKeypad teamId="blue" disabled={false} onKey={vi.fn()} />);

    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(screen.getByRole('button', { name: digit })).toBeTruthy();
    }

    // The two symbol keys are announced as words, not as their glyphs.
    expect(screen.getByRole('button', { name: /clear/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /backspace/i })).toBeTruthy();

    // The pad is announced as one group rather than twelve loose buttons.
    expect(screen.getByRole('group', { name: /keypad/i })).toBeTruthy();
  });

  it('gives every keypad button an accessible name and an explicit type', () => {
    render(<NumericKeypad teamId="blue" disabled={false} onKey={vi.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      expect(
        button.getAttribute('aria-label') ?? button.textContent?.trim(),
        `a button is unnamed: ${button.outerHTML}`,
      ).toBeTruthy();

      // Without an explicit type a button inside a form submits it, which on
      // the student pad would send a half-typed answer on the first keypress.
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('tells the two scores apart without relying on their colour', () => {
    seedStore(makeState());
    render(<TopGameHeader />);

    // Both scores read "0" and are distinguished on screen by colour and
    // position, neither of which a screen reader conveys.
    const blue = screen.getByRole('status', { name: /blue.*score/i });
    const red = screen.getByRole('status', { name: /red.*score/i });
    expect(blue).not.toBe(red);
  });
});

describe('announcements', () => {
  it('reads the typed answer back as it changes', () => {
    const name = seatBlueStudent();
    render(<StudentController teamId="blue" playerName={name} onLeave={vi.fn()} />);

    // The digits are the only confirmation that a tap registered, so a student
    // with low vision needs the value announced rather than only drawn.
    expect(screen.getByLabelText(/your answer/i).getAttribute('aria-live')).toBe('polite');
  });

  it('marks the countdown as a timer rather than as plain text', () => {
    const name = seatBlueStudent();
    render(<StudentController teamId="blue" playerName={name} onLeave={vi.fn()} />);
    expect(screen.getByRole('timer', { name: /time remaining/i })).toBeTruthy();
  });
});

describe('keyboard and pointer targets', () => {
  it('leaves every keypad key reachable by keyboard', () => {
    render(<NumericKeypad teamId="blue" disabled={false} onKey={vi.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      // A real button is focusable by default; a div with an onClick is not,
      // which is the mistake this guards against.
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('tabindex')).not.toBe('-1');
    }
  });

  it('disables keys rather than removing them when input is locked', () => {
    render(<NumericKeypad teamId="blue" disabled onKey={vi.fn()} />);

    const keys = screen.getAllByRole('button');
    expect(keys.length).toBeGreaterThan(0);

    // Keeping the pad present and disabled means the layout does not jump and
    // focus is not thrown to the top of the page mid-round.
    for (const key of keys) expect((key as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('colour independence', () => {
  it('labels each team by name as well as by colour', () => {
    const state = makeState();
    seedStore(state);
    render(<TopGameHeader />);

    // The team identity is carried in text, so it survives a colour-blind
    // viewer, a greyscale projector and a screen reader alike.
    for (const teamId of ['blue', 'red'] as TeamId[]) {
      const name = state.teams[teamId].name;
      expect(screen.getAllByText(new RegExp(name, 'i')).length).toBeGreaterThan(0);
    }
  });

  it('states the round outcome in words, not only as a colour change', () => {
    const name = seatBlueStudent({ lockedTeams: ['blue'] });
    render(<StudentController teamId="blue" playerName={name} onLeave={vi.fn()} />);

    // Somewhere on screen the student is told in words what happened.
    expect(screen.getByRole('main').textContent).toMatch(/lock|correct|teammate|attempt|wait/i);
  });
});
