import { memo } from 'react';
import type { TeamId } from '@braintug/shared';
import { isNumericPrompt } from '@braintug/shared';
import { QuestionOptions } from '../../../question/QuestionOptions';
import { useTeamQuestion } from '../../../../store/selectors';
import { MirroredKeypad } from './MirroredKeypad';

export type TeamAnswerSurfaceProps = {
  teamId: TeamId;
};

/**
 * The classroom mirror of whatever the student is answering on: a keypad for
 * numeric questions, the option list for multiple choice and true/false.
 * Never interactive.
 */
export const TeamAnswerSurface = memo(function TeamAnswerSurface({ teamId }: TeamAnswerSurfaceProps) {
  const question = useTeamQuestion(teamId);

  if (!question) return null;
  if (isNumericPrompt(question)) return <MirroredKeypad teamId={teamId} />;
  if (question.type === 'type_answer') return null;
  return <QuestionOptions question={question} />;
});
