export const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division'] as const;
export type Operation = (typeof OPERATIONS)[number];

/** What a host can pick. `mixed` draws from all four concrete operations. */
export const OPERATION_CHOICES = [...OPERATIONS, 'mixed'] as const;
export type OperationChoice = (typeof OPERATION_CHOICES)[number];

export const OPERATION_SYMBOL: Record<Operation, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: '\u00d7',
  division: '\u00f7',
};

export const OPERATION_LABEL: Record<OperationChoice, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
  mixed: 'Mixed',
};

export function formatPrompt(operation: Operation, left: number, right: number): string {
  return `${left} ${OPERATION_SYMBOL[operation]} ${right}`;
}
