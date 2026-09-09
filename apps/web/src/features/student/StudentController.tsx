import { useCallback, useEffect, useState } from 'react';
import type { AnswerOutcome, GameStatus, TeamId } from '@braintug/shared';
import { request } from '../../realtime/socket';
import { useGameStore } from '../../store/gameStore';
import {
  useIHaveAttempted,
  useMyOutcome,
  useStatus,
  useTeamLocked,
  useTeamName,
  useTeamPrompt,
  useTeamQuestionId,
} from '../../store/selectors';
import { AnswerFeedback } from './AnswerFeedback';
import { AnswerInput } from './AnswerInput';
import { NumericKeypad, type KeypadKey } from './NumericKeypad';
import { StudentQuestionCard } from './StudentQuestionCard';
import { StudentStatusBar } from './StudentStatusBar';
import { StudentTimerBar } from './StudentTimerBar';
import { StudentResults } from './StudentResults';
import { useDraftEmitter } from './useDraftEmitter';

export type StudentControllerProps = {
  teamId: TeamId;
  playerName: string;
  /** Invoked from the results screen to release the seat and join a new match. */
  onLeave: () => void;
};

/**
 * Answers are short, and a longer entry is always a mis-tap rather than a real
 * attempt. Capping here also keeps the value inside the server's schema bound.
 */
const MAX_DIGITS = 6;

export function StudentController({ teamId, playerName, onLeave }: StudentControllerProps) {
  const status = useStatus();
  const questionId = useTeamQuestionId(teamId);
  const prompt = useTeamPrompt(teamId);
  const attempted = useIHaveAttempted();
  const teamLocked = useTeamLocked(teamId);
  const outcome = useMyOutcome();
  const teamName = useTeamName(teamId);

  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /**
   * Set the moment an attempt is acknowledged, so the pad closes on the ack
   * rather than waiting for the state broadcast that follows it. Without this
   * the keypad stays live for a round trip after the student has already
   * answered, and invites a second tap.
   */
  const [spent, setSpent] = useState(false);

  // A new question resets the pad. Keyed on the question id rather than the
  // round index so a resynced state after a reconnect also clears it.
  useEffect(() => {
    setValue('');
    setSubmitting(false);
    setSpent(false);
  }, [questionId]);

  const canType = status === 'active' && !!questionId && !attempted && !teamLocked && !spent;

  // Mirror typing to the classroom display. Passing null once the student is
  // locked out stops any late draft from reanimating the TV keypad.
  const emitDraft = useDraftEmitter(canType ? questionId : null);
  useEffect(() => {
    emitDraft(value);
  }, [value, emitDraft]);

  const submit = useCallback(async () => {
    if (!questionId || !value || submitting) return;
    setSubmitting(true);
    try {
      const result = await request<AnswerOutcome>('submit_answer', { questionId, value });
      useGameStore.getState().setMyOutcome(result);
      setValue('');
      // A rejection did not consume the attempt, so the pad stays open; the
      // authoritative state that follows will close it if it should be closed.
      if (result.status !== 'rejected') setSpent(true);
    } catch (error) {
      // A submission that never landed is not an attempt, so the student keeps
      // their turn and their typed value.
      useGameStore.getState().setError((error as Error).message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }, [questionId, value, submitting]);

  const press = useCallback(
    (key: KeypadKey) => {
      if (!canType) return;
      setValue((current) => {
        if (key === 'C') return '';
        if (key === '<') return current.slice(0, -1);
        if (current.length >= MAX_DIGITS) return current;
        // Reject a leading zero so `07` can never be submitted as an answer.
        if (key === '0' && current.length === 0) return current;
        return current + key;
      });
    },
    [canType],
  );

  // Physical keyboard, for a teacher demonstrating on a laptop. The keypad
  // remains the primary surface; this only mirrors it.
  useEffect(() => {
    if (!canType) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key >= '0' && event.key <= '9') press(event.key);
      else if (event.key === 'Backspace') press('<');
      else if (event.key === 'Escape') press('C');
      else if (event.key === 'Enter') void submit();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canType, press, submit]);

  if (status === 'finished') {
    return <StudentResults teamId={teamId} playerName={playerName} onLeave={onLeave} />;
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <StudentStatusBar teamId={teamId} playerName={playerName} />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {status === 'lobby' ? (
          <WaitPanel
            title="You're in!"
            body={`You're on ${teamName}. Waiting for your teacher to start the game.`}
          />
        ) : status === 'countdown' ? (
          <WaitPanel title="Get ready" body="The first question is about to appear." />
        ) : (
          <>
            <StudentTimerBar />
            <StudentQuestionCard teamId={teamId} />
            <AnswerFeedback outcome={outcome} />

            {canType ? (
              <>
                <AnswerInput teamId={teamId} value={value} />
                <NumericKeypad teamId={teamId} disabled={false} onKey={press} />
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!value || submitting}
                  className="bt-focus h-16 touch-manipulation rounded-card bg-ink font-display text-xl font-extrabold text-white shadow-key transition active:translate-y-px disabled:opacity-30"
                >
                  {submitting ? 'Sending\u2026' : 'Lock it in'}
                </button>
              </>
            ) : (
              <LockoutPanel
                status={status}
                attempted={attempted || spent}
                teamLocked={teamLocked}
                hasQuestion={prompt !== null}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function WaitPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="bt-panel grid flex-1 place-items-center px-6 py-10 text-center">
      <div>
        <p className="font-display text-2xl font-extrabold text-ink">{title}</p>
        <p className="mt-2 text-sm font-semibold text-ink-muted">{body}</p>
      </div>
    </div>
  );
}

/** Explains precisely why the keypad is gone, so waiting never looks like a bug. */
function LockoutPanel({
  status,
  attempted,
  teamLocked,
  hasQuestion,
}: {
  status: GameStatus;
  attempted: boolean;
  teamLocked: boolean;
  hasQuestion: boolean;
}) {
  const { title, body } =
    status === 'paused'
      ? { title: 'Paused', body: 'Your teacher paused the game. The clock is stopped.' }
      : !hasQuestion
        ? { title: 'Next question coming', body: 'Hold tight.' }
        : teamLocked && !attempted
          ? { title: 'Teammate got it', body: 'Your team already locked in this answer.' }
          : attempted
            ? { title: 'Answer sent', body: 'One attempt per question. Waiting for the next one.' }
            : { title: 'Waiting', body: 'Hold tight.' };

  return (
    <div className="bt-card px-5 py-6 text-center">
      <p className="font-display text-xl font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-sm font-semibold text-ink-muted">{body}</p>
    </div>
  );
}
