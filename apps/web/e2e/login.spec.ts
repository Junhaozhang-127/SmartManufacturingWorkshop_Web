import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import { mockDashboardApis } from './fixtures';

test('login redirects to dashboard and persists session', async ({ page }) => {
  const username = `user_${randomUUID().slice(0, 8)}`;
  const password = randomUUID();

  await mockDashboardApis(page, username);

  await page.goto('/login');

  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('.login-card__submit').click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Need review')).toBeVisible();

  const authState = await page.evaluate(() => localStorage.getItem('smw-web-auth'));
  expect(authState).toContain('mock-token');
});

