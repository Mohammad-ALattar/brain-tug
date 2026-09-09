import { expect, test, type Page } from '@playwright/test';
import { answerCurrentQuestion, createMatch, joinAsStudent, openDevice } from './helpers';

/**
 * End-to-end coverage across all three roles at once.
 *
 * Each role runs in its own browser context, so these tests exercise the real
 * fan-out: a student answering on one device has to travel through the server
 * and land on the teacher's dashboard and the classroom display. Nothing here
 * touches the store or the socket directly.
 */

/** Opens the classroom display for a room and waits for it to attach. */
async function openArena(page: Page, roomCode: string): Promise<void> {
  await page.goto(`/arena/${roomCode}`);
  await expect(page.getByText(/waiting in lobby/i)).toBeVisible();
}

test('a teacher runs a match while students answer and the class watches', async ({ browser }) => {
  const teacher = await openDevice(browser);
  const arena = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const roomCode = await createMatch(teacher);
  await openArena(arena, roomCode);

  await joinAsStudent(bluePhone, roomCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, roomCode, 'Rai', 'Red');

  // The roster on the teacher's dashboard reflects both phones.
  await expect(teacher.getByText(/players \(2\)/i)).toBeVisible();
  await expect(teacher.getByText(/teams are balanced/i)).toBeVisible();

  // ...and so does the classroom display, where each name appears both in the
  // roster and in the active-responder column.
  await expect(arena.getByText('Bea').first()).toBeVisible();
  await expect(arena.getByText('Rai').first()).toBeVisible();

  await teacher.getByRole('button', { name: /start match/i }).click();

  // The countdown overlay plays on the display, then the first question appears.
  await expect(arena.getByText(/take hold of the rope/i)).toBeVisible();
  await expect(arena.getByText(/question 1 \/ 5/i)).toBeVisible({ timeout: 15_000 });

  const blueScore = arena.getByRole('status', { name: /blue.*score/i });
  await expect(blueScore).toHaveText(/0/);

  await answerCurrentQuestion(bluePhone);

  // The answer landed: the student is told, the class sees the score, and the
  // banner names the team now pulling.
  await expect(bluePhone.getByText(/correct/i)).toBeVisible();
  await expect(blueScore).toHaveText(/1/);
  await expect(arena.getByText(/pulling!/i)).toBeVisible();

  // Their single attempt is spent.
  await expect(bluePhone.getByText(/you're done for this question/i)).toBeVisible();
  await expect(bluePhone.getByRole('button', { name: /lock it in/i })).toHaveCount(0);
});

test('the classroom display never shows an answer while a student is typing', async ({
  browser,
}) => {
  const teacher = await openDevice(browser);
  const arena = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const roomCode = await createMatch(teacher);
  await openArena(arena, roomCode);
  await joinAsStudent(bluePhone, roomCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, roomCode, 'Rai', 'Red');

  await teacher.getByRole('button', { name: /start match/i }).click();
  await expect(arena.getByText(/question 1 \/ 5/i)).toBeVisible({ timeout: 15_000 });

  // Type without submitting.
  await bluePhone.getByRole('button', { name: '4', exact: true }).click();
  await bluePhone.getByRole('button', { name: '2', exact: true }).click();
  await expect(bluePhone.getByLabel(/your answer/i)).toContainText('42');

  // The display mirrors that two keys were pressed, but not which ones.
  const arenaText = await arena.locator('body').innerText();
  expect(arenaText).not.toContain('42');
});

test('a student who reloads mid-match keeps their seat and their score', async ({ browser }) => {
  const teacher = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const roomCode = await createMatch(teacher);
  await joinAsStudent(bluePhone, roomCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, roomCode, 'Rai', 'Red');

  await teacher.getByRole('button', { name: /start match/i }).click();
  await expect(bluePhone.getByText(/question 1 of 5/i)).toBeVisible({ timeout: 15_000 });

  await answerCurrentQuestion(bluePhone);
  await expect(bluePhone.getByText(/correct/i)).toBeVisible();

  // The phone locks and the tab is discarded; reopening must reclaim the seat
  // from the stored player token rather than asking the child to rejoin.
  await bluePhone.reload();

  await expect(bluePhone.getByText(/^Bea/)).toBeVisible();
  await expect(bluePhone.getByRole('button', { name: /join the game/i })).toHaveCount(0);
  // Their spent attempt survived the reload, so they cannot answer twice.
  await expect(
    bluePhone.getByText(/you're done for this question|answer sent|teammate got it/i),
  ).toBeVisible();
});

test('a student who reloads after the match still sees the final scores', async ({ browser }) => {
  const teacher = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const roomCode = await createMatch(teacher);
  await joinAsStudent(bluePhone, roomCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, roomCode, 'Rai', 'Red');

  await teacher.getByRole('button', { name: /start match/i }).click();
  await expect(bluePhone.getByText(/question 1 of 5/i)).toBeVisible({ timeout: 15_000 });
  await answerCurrentQuestion(bluePhone);

  // The teacher calls time.
  await teacher.getByRole('button', { name: /end match/i }).click();
  await teacher.getByRole('button', { name: /yes, end it/i }).click();

  await expect(bluePhone.getByText(/final result/i)).toBeVisible();
  await expect(bluePhone.getByText(/your team won/i)).toBeVisible();

  // Reloading must not strand the child on a spinner. `game_finished` has
  // already fired, so the result can only come back on the rejoin ack.
  await bluePhone.reload();

  await expect(bluePhone.getByText(/final result/i)).toBeVisible();
  await expect(bluePhone.getByText(/waiting for the final scores/i)).toHaveCount(0);

  // Their own contribution, which is what the card leads with.
  await expect(bluePhone.getByText(/^Bea$/)).toBeVisible();
  await expect(bluePhone.getByText(/accuracy/i)).toBeVisible();
});

test('a student can move from a finished match into the teacher\u2019s next one', async ({
  browser,
}) => {
  const teacher = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const firstCode = await createMatch(teacher);
  await joinAsStudent(bluePhone, firstCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, firstCode, 'Rai', 'Red');

  await teacher.getByRole('button', { name: /start match/i }).click();
  await expect(bluePhone.getByText(/question 1 of 5/i)).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole('button', { name: /end match/i }).click();
  await teacher.getByRole('button', { name: /yes, end it/i }).click();
  await expect(bluePhone.getByText(/final result/i)).toBeVisible();

  // The teacher sets up a second match, which gets a different room code.
  await teacher.getByRole('button', { name: /set up another match/i }).click();
  const secondCode = await createMatch(teacher);
  expect(secondCode).not.toBe(firstCode);

  // The student leaves the finished match from their own screen.
  await bluePhone.getByRole('button', { name: /join another game/i }).click();

  // They land on code entry with their name remembered but the stale code gone,
  // so they cannot accidentally rejoin the match that just ended.
  const codeField = bluePhone.getByLabel(/room code/i);
  await expect(codeField).toBeVisible();
  await expect(codeField).toHaveValue('');
  await expect(bluePhone.getByLabel(/your name/i)).toHaveValue('Bea');

  await codeField.fill(secondCode);
  await bluePhone.getByRole('button', { name: /join the game/i }).click();

  await expect(bluePhone.getByText(/you're in/i)).toBeVisible();
  await expect(teacher.getByText(/players \(1\)/i)).toBeVisible();
});

test('pausing from the dashboard locks the students out', async ({ browser }) => {
  const teacher = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const roomCode = await createMatch(teacher);
  await joinAsStudent(bluePhone, roomCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, roomCode, 'Rai', 'Red');

  await teacher.getByRole('button', { name: /start match/i }).click();
  await expect(bluePhone.getByText(/question 1 of 5/i)).toBeVisible({ timeout: 15_000 });

  await teacher.getByRole('button', { name: /^pause$/i }).click();

  await expect(bluePhone.getByText(/your teacher paused the game/i)).toBeVisible();
  await expect(bluePhone.getByRole('button', { name: /lock it in/i })).toHaveCount(0);

  // Resuming hands the keypad back.
  await teacher.getByRole('button', { name: /^resume$/i }).click();
  await expect(bluePhone.getByRole('button', { name: /lock it in/i })).toBeVisible();
  await bluePhone.getByRole('button', { name: '1', exact: true }).click();
  await expect(bluePhone.getByLabel(/your answer/i)).toContainText('1');
});
