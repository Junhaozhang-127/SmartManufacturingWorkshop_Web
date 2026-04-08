import { expect, test } from '@playwright/test';

import { mockDashboardApis } from './fixtures';

test('login redirects to dashboard and persists session', async ({ page }) => {
  await mockDashboardApis(page);

  await page.goto('/login');

  await page.locator('input[type="text"]').first().fill('teacher01');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('.login-card__submit').click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Need review')).toBeVisible();

  const authState = await page.evaluate(() => localStorage.getItem('smw-web-auth'));
  expect(authState).toContain('mock-token');
});
