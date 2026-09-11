import { useCallback, useEffect, useState } from 'react';
import type { AnswerOutcome, GameStatus, TeamId } from '@braintug/shared';
import { request } from '../../realtime/socket';
import { useGameStore } from '../../store/gameStore';
import {
  useGameMode,
  useIHaveAttempted,
  useMyOutcome,
  useStatus,
  useTeamLocked,
  useTeamName,
  useTeamPrompt,
  useTeamQuestion,
  useTeamQuestionId,
} from '../../store/selectors';
import { copyFor } from '../arena/modeCopy';
import { AnswerFeedback } from './AnswerFeedback';
import { StudentQuestionCard } from './StudentQuestionCard';
import { StudentRaceStrip } from './StudentRaceStrip';
import { StudentStatusBar } from './StudentStatusBar';
import { StudentTimerBar } from './StudentTimerBar';
import { StudentResults } from './StudentResults';
import { AnswerPad, isAnswerableQuestion } from './answer/AnswerPad';

export type StudentControllerProps = {
  teamId: TeamId;
  playerName: string;
  onLeave: () => void;
};

export function StudentController({ teamId, playerName, onLeave }: StudentControllerProps) {
  const status = useStatus();
  const questionId = useTeamQuestionId(teamId);
  const question = useTeamQuestion(teamId);
  const prompt = useTeamPrompt(teamId);
  const attempted = useIHaveAttempted();
  const teamLocked = useTeamLocked(teamId);
  const outcome = useMyOutcome();
  const teamName = useTeamName(teamId);
  const mode = useGameMode();

  const [submitting, setSubmitting] = useState(false);
  const [spent, setSpent] = useState(false);

  useEffect(() => {
    setSubmitting(false);
    setSpent(false);
  }, [questionId]);

  const canType =
    status === 'active' &&
    isAnswerableQuestion(question) &&
    !!questionId &&
    !attempted &&
    !teamLocked &&
    !spent;

  const submit = useCallback(
    async (value: string) => {
      if (!questionId || !value || submitting) return;
      setSubmitting(true);
      try {
        const result = await request<AnswerOutcome>('submit_answer', { questionId, value });
        useGameStore.getState().setMyOutcome(result);
        if (result.status !== 'rejected') setSpent(true);
      } catch (error) {
        useGameStore.getState().setError((error as Error).message);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    },
    [questionId, submitting],
  );

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
            {mode === 'brain_race' ? (
              <StudentRaceStrip teamId={teamId} playerName={playerName} />
            ) : null}
            <StudentTimerBar />
            <StudentQuestionCard teamId={teamId} />
            <AnswerFeedback outcome={outcome} />

            {canType ? (
              <AnswerPad
                question={question}
                teamId={teamId}
                canType={canType}
                submitting={submitting}
                onSubmit={(value) => void submit(value)}
              />
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
  const copy = copyFor(useGameMode());
  const { title, body } =
    status === 'paused'
      ? { title: 'Paused', body: 'Your teacher paused the game. The clock is stopped.' }
      : !hasQuestion
        ? { title: 'Next question coming', body: 'Hold tight.' }
        : teamLocked && !attempted
          ? { title: 'Teammate got it', body: 'Your team already locked in this answer.' }
          : attempted && teamLocked
            ? { title: 'Answer sent', body: 'One attempt per question. Waiting for the next one.' }
            : attempted
              ? { title: "You're done for this question", body: copy.roundStillOpen }
              : { title: 'Waiting', body: 'Hold tight.' };

  return (
    <div className="bt-card px-5 py-6 text-center">
      <p className="font-display text-xl font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-sm font-semibold text-ink-muted">{body}</p>
    </div>
  );
}
