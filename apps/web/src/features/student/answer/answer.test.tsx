import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnswerOutcome, PublicQuestion, QuestionId } from '@braintug/shared';
import { makeState, playerOn, resetStore, seedStore } from '../../../test/fixtures';
import { StudentController } from '../StudentController';

vi.mock('../../../realtime/socket', () => ({
  request: vi.fn(),
  notify: vi.fn(),
  getSocket: vi.fn(() => ({ connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() })),
}));

const { request, notify } = await import('../../../realtime/socket');
const requestMock = request as unknown as Mock;
const notifyMock = notify as unknown as Mock;

const ACK: AnswerOutcome = {
  status: 'correct',
  questionId: 'q' as QuestionId,
  gain: 0.055,
  points: 1,
  streak: 1,
  elapsedMs: 400,
};

afterEach(() => {
  cleanup();
  resetStore();
});

beforeEach(() => {
  requestMock.mockReset();
  notifyMock.mockReset();
  requestMock.mockResolvedValue(ACK);
});

function withQuestion(question: PublicQuestion) {
  const state = makeState();
  const next = {
    ...state,
    currentQuestion: { blue: question, red: question },
  };
  const me = playerOn(next, 'blue', 0);
  seedStore(next, { playerId: me.id, teamId: 'blue' });
  render(<StudentController teamId="blue" playerName={me.name} onLeave={vi.fn()} />);
  return { state: next, me };
}

describe('ChoiceInput', () => {
  const question: PublicQuestion = {
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
  };

  it('submits the option id, not the option text', async () => {
    withQuestion(question);

    await userEvent.click(screen.getByRole('button', { name: /mars/i }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('submit_answer', {
        questionId: question.id,
        value: 'a',
      }),
    );
  });

  it('locks the pad after an attempt', async () => {
    withQuestion(question);

    await userEvent.click(screen.getByRole('button', { name: /earth/i }));

    await waitFor(() => expect(screen.getByText(/you're done for this question/i)).toBeDefined());
    expect(screen.queryByRole('group', { name: /answer choices/i })).toBeNull();
  });

  it('never relays a draft for a multiple-choice question', async () => {
    withQuestion(question);
    await userEvent.click(screen.getByRole('button', { name: /mars/i }));
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe('TrueFalseInput', () => {
  const question: PublicQuestion = {
    id: 'tf1' as QuestionId,
    subject: 'science',
    difficulty: 'easy',
    type: 'true_false',
    prompt: 'The Sun is a star.',
  };

  it('submits "true" or "false" as the value', async () => {
    withQuestion(question);

    await userEvent.click(screen.getByRole('button', { name: 'True' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('submit_answer', {
        questionId: question.id,
        value: 'true',
      }),
    );
  });
});

describe('TypeAnswerInput', () => {
  it('submits a trimmed text answer', async () => {
    withQuestion({
      id: 'ta1' as QuestionId,
      subject: 'english',
      difficulty: 'easy',
      type: 'type_answer',
      inputMode: 'text',
      prompt: 'What is the opposite of hot?',
    });

    await userEvent.type(screen.getByLabelText(/your answer/i), '  cold  ');
    await userEvent.click(screen.getByRole('button', { name: /lock it in/i }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('submit_answer', {
        questionId: 'ta1',
        value: 'cold',
      }),
    );
  });
});
