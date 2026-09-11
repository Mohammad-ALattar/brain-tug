import { memo } from 'react';
import type { PublicQuestion, QuestionType, TeamId } from '@braintug/shared';
import { ChoiceInput } from './ChoiceInput';
import { TrueFalseInput } from './TrueFalseInput';
import { TypeAnswerInput } from './TypeAnswerInput';

export type AnswerPadProps = {
  question: PublicQuestion | null;
  teamId: TeamId;
  canType: boolean;
  submitting: boolean;
  onSubmit: (value: string) => void;
};

/** Whether the student controller should offer an answer surface for this question. */
export function isAnswerableQuestion(question: PublicQuestion | null): boolean {
  return question !== null;
}

/**
 * Normalises the question type before choosing a pad.
 *
 * A partial payload that only carries `prompt` and `id` used to render the card
 * but left the pad blank, because the switch had no matching case.
 */
function resolveAnswerType(question: PublicQuestion): QuestionType {
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    return question.type;
  }
  if (question.type === 'type_answer') return 'type_answer';
  // Legacy or partial snapshots: math prompts are always typed on the keypad.
  return 'type_answer';
}

/**
 * The student's answer surface. One component per question type, chosen here
 * so adding a type never means growing StudentController.
 */
export const AnswerPad = memo(function AnswerPad({
  question,
  teamId,
  canType,
  submitting,
  onSubmit,
}: AnswerPadProps) {
  if (!question || !canType) return null;

  switch (resolveAnswerType(question)) {
    case 'multiple_choice':
      if (question.type !== 'multiple_choice') return null;
      return (
        <ChoiceInput
          options={question.options}
          teamId={teamId}
          disabled={submitting}
          onChoose={onSubmit}
        />
      );
    case 'true_false':
      return <TrueFalseInput teamId={teamId} disabled={submitting} onChoose={onSubmit} />;
    case 'type_answer':
      return (
        <TypeAnswerInput
          teamId={teamId}
          inputMode={question.type === 'type_answer' ? question.inputMode : 'number'}
          disabled={submitting}
          onSubmit={onSubmit}
        />
      );
  }
});
