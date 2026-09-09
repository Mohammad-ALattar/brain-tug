import { expect, test, type Page } from '@playwright/test';
import { answerCurrentQuestion, createMatch, joinAsStudent, openDevice } from './helpers';

async function openArena(page: Page, roomCode: string): Promise<void> {
  await page.goto(`/arena/${roomCode}`);
  await expect(page.getByText(/waiting in lobby/i)).toBeVisible();
}

test('a teacher runs a Brain Race while students answer and the class watches', async ({
  browser,
}) => {
  const teacher = await openDevice(browser);
  const arena = await openDevice(browser);
  const bluePhone = await openDevice(browser);
  const redPhone = await openDevice(browser);

  const roomCode = await createMatch(teacher, { mode: 'brain_race' });
  await openArena(arena, roomCode);

  await joinAsStudent(bluePhone, roomCode, 'Bea', 'Blue');
  await joinAsStudent(redPhone, roomCode, 'Rai', 'Red');

  await expect(teacher.getByText(/players \(2\)/i)).toBeVisible();

  await teacher.getByRole('button', { name: /start match/i }).click();

  await expect(arena.getByText(/get to the start line/i)).toBeVisible();
  await expect(arena.getByText(/question 1 \/ 5/i)).toBeVisible({ timeout: 15_000 });
  await expect(arena.getByText(/0m \/ 1000m/i).first()).toBeVisible();

  const blueCorrect = arena.getByRole('status', { name: /blue.*correct answers/i });
  const redCorrect = arena.getByRole('status', { name: /red.*correct answers/i });
  await expect(blueCorrect).toHaveText(/0/);
  await expect(redCorrect).toHaveText(/0/);

  await answerCurrentQuestion(bluePhone);
  await expect(bluePhone.getByText(/correct/i)).toBeVisible();
  await expect(bluePhone.getByText(/your racer moved/i)).toBeVisible();
  await expect(blueCorrect).toHaveText(/1/);
  await expect(arena.getByText(/m \/ 1000m/i).first()).toBeVisible();

  // The same question stays open for the other team: every correct answer counts.
  await answerCurrentQuestion(redPhone);
  await expect(redPhone.getByText(/correct/i)).toBeVisible();
  await expect(redCorrect).toHaveText(/1/);

  await expect(bluePhone.getByText(/you're done for this question/i)).toBeVisible();
  await expect(bluePhone.getByRole('button', { name: /lock it in/i })).toHaveCount(0);
});
