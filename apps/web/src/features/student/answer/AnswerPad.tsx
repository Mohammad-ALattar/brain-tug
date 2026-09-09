import { memo } from 'react';
import type { PublicQuestion, TeamId } from '@braintug/shared';
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

  switch (question.type) {
    case 'multiple_choice':
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
          inputMode={question.inputMode}
          disabled={submitting}
          onSubmit={onSubmit}
        />
      );
  }
});
