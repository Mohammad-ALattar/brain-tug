import { expect, type Browser, type Page } from '@playwright/test';

/**
 * Shared driving code for the end-to-end suite.
 *
 * Everything here goes through the same surfaces a person uses: visible labels,
 * accessible roles and the on-screen keypad. Nothing reaches into the store or
 * the socket, so a test passing means the real path works.
 */

/** Opens an isolated context, as a separate device in the classroom would be. */
export async function openDevice(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

/** Creates a match on the teacher dashboard and returns its room code. */
export async function createMatch(
  page: Page,
  options: { questions?: number; seconds?: number } = {},
): Promise<string> {
  await page.goto('/host');

  // Fewer, longer questions keep the suite fast without racing the clock.
  const questions = options.questions ?? 5;
  for (let i = 20; i > questions; i -= 5) {
    await page.getByRole('button', { name: /fewer questions/i }).click();
  }

  await page.getByRole('button', { name: /create match/i }).click();

  const code = await page.getByText(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/).innerText();
  return code.replace('-', '');
}

/** Joins as a student and waits until they are seated. */
export async function joinAsStudent(
  page: Page,
  roomCode: string,
  name: string,
  team: 'Blue' | 'Red',
): Promise<void> {
  await page.goto(`/play/${roomCode}`);
  await page.getByLabel(/your name/i).fill(name);
  await page.getByRole('button', { name: team, exact: true }).click();
  await page.getByRole('button', { name: /join the game/i }).click();

  await expect(page.getByText(/you're in/i)).toBeVisible();
}

const OPERATORS: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '\u2212': (a, b) => a - b,
  '-': (a, b) => a - b,
  '\u00d7': (a, b) => a * b,
  'x': (a, b) => a * b,
  '\u00f7': (a, b) => a / b,
};

/**
 * Reads the prompt off the student's screen and works out the answer, exactly
 * as a child does. The correct answer is never on the wire, so there is nowhere
 * else a test could get it from.
 */
export function solve(prompt: string): number {
  const match = prompt.match(/(-?\d+)\s*(\S)\s*(-?\d+)/);
  if (!match) throw new Error(`Unreadable prompt: ${prompt}`);

  const [, left, operator, right] = match;
  const apply = OPERATORS[operator!];
  if (!apply) throw new Error(`Unknown operator in prompt: ${prompt}`);

  return apply(Number(left), Number(right));
}

/** Types a number on the student keypad and locks it in. */
export async function answerWithKeypad(page: Page, value: number): Promise<void> {
  const typed = String(value);
  if (!/^\d{1,6}$/.test(typed)) {
    throw new Error(`Cannot type ${typed} on a digits-only keypad`);
  }

  for (const digit of typed) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  // Confirm the pad registered every tap before submitting. Without this a
  // dropped tap surfaces as an inscrutable "submit is disabled" timeout instead
  // of a clear mismatch.
  await expect(page.getByLabel(/your answer/i)).toContainText(typed);

  await page.getByRole('button', { name: /lock it in/i }).click();
}

/** Reads the team's current prompt off the student's own question card. */
export async function readPrompt(page: Page): Promise<string> {
  const card = page.locator('section', {
    has: page.getByText(/question \d+ of \d+/i),
  });
  const prompt = card.locator('p[aria-live="polite"]');
  await expect(prompt).toContainText(/\d/);
  return prompt.innerText();
}

/** Answers the current question correctly, waiting for one to be on screen. */
export async function answerCurrentQuestion(page: Page): Promise<number> {
  const answer = solve(await readPrompt(page));
  await answerWithKeypad(page, answer);
  return answer;
}
