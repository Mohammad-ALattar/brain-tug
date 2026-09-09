import { memo, useCallback, useEffect, useState } from 'react';
import type { TeamId } from '@braintug/shared';
import { TEAM_THEME } from '../../../design/teamTheme';
import { useTeamQuestionId } from '../../../store/selectors';
import { useDraftEmitter } from '../useDraftEmitter';
import { NumericKeypad, type KeypadKey } from '../NumericKeypad';
import { AnswerInput } from '../AnswerInput';

const MAX_DIGITS = 6;
const MAX_TEXT = 32;

export type TypeAnswerInputProps = {
  teamId: TeamId;
  inputMode: 'number' | 'text';
  disabled: boolean;
  onSubmit: (value: string) => void;
};

export const TypeAnswerInput = memo(function TypeAnswerInput({
  teamId,
  inputMode,
  disabled,
  onSubmit,
}: TypeAnswerInputProps) {
  const questionId = useTeamQuestionId(teamId);
  const [value, setValue] = useState('');
  const canType = !disabled;
  const emitDraft = useDraftEmitter(canType ? questionId : null);

  useEffect(() => {
    setValue('');
  }, [questionId]);

  useEffect(() => {
    emitDraft(value);
  }, [value, emitDraft]);

  const press = useCallback(
    (key: KeypadKey) => {
      if (!canType) return;
      setValue((current) => {
        if (key === 'C') return '';
        if (key === '<') return current.slice(0, -1);
        if (current.length >= MAX_DIGITS) return current;
        if (key === '0' && current.length === 0) return current;
        return current + key;
      });
    },
    [canType],
  );

  useEffect(() => {
    if (!canType || inputMode !== 'number') return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key >= '0' && event.key <= '9') press(event.key);
      else if (event.key === 'Backspace') press('<');
      else if (event.key === 'Escape') press('C');
      else if (event.key === 'Enter' && value) onSubmit(value);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canType, inputMode, press, onSubmit, value]);

  if (inputMode === 'text') {
    const theme = TEAM_THEME[teamId];
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <input
          type="text"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MAX_TEXT}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value.slice(0, MAX_TEXT))}
          aria-label="Your answer"
          className={`bt-focus h-16 rounded-card border-2 px-4 font-display text-2xl font-extrabold ${theme.border} bg-paper-card text-ink`}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="bt-focus h-16 touch-manipulation rounded-card bg-ink font-display text-xl font-extrabold text-white shadow-key transition active:translate-y-px disabled:opacity-30"
        >
          Lock it in
        </button>
      </form>
    );
  }

  return (
    <>
      <AnswerInput teamId={teamId} value={value} />
      <NumericKeypad teamId={teamId} disabled={disabled} onKey={press} />
      <button
        type="button"
        onClick={() => onSubmit(value)}
        disabled={!value || disabled}
        className="bt-focus h-16 touch-manipulation rounded-card bg-ink font-display text-xl font-extrabold text-white shadow-key transition active:translate-y-px disabled:opacity-30"
      >
        Lock it in
      </button>
    </>
  );
});
