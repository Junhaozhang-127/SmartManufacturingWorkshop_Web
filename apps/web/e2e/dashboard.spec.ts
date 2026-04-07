import { expect, test } from '@playwright/test';

import { mockDashboardApis, persistedAuthState } from './fixtures';

test('dashboard shows aggregated data and notification jump works', async ({ page }) => {
  await page.addInitScript((value) => {
    localStorage.setItem('smw-web-auth', value);
  }, persistedAuthState());

  await mockDashboardApis(page);
  await page.goto('/');

  await expect(page.getByText('指导教师驾驶舱')).toBeVisible();
  await expect(page.getByText('Fund Request #1')).toBeVisible();
  await expect(page.getByText('Approval Assigned')).toBeVisible();

  await page.getByText('Approval Assigned').click();
  await expect(page).toHaveURL(/workflow\/approval-center/);
  await expect(page).toHaveURL(/focus=1001/);
});
