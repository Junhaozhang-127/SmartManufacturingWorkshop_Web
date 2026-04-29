import { expect, test } from '@playwright/test';

import { mockApprovalCenterApis, mockLoginApis, persistedAuthState } from './fixtures';

test('approval center e2e: pending -> detail -> approve -> processed with log trace', async ({ page }) => {
  await page.addInitScript((value) => {
    localStorage.setItem('smw-web-auth', value);
  }, persistedAuthState());

  await mockLoginApis(page, 'e2e_teacher');
  await mockApprovalCenterApis(page);
  await page.route('**/api/notifications**', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          unreadCount: 0,
          total: 0,
          list: [],
        },
      },
    });
  });

  await page.goto('/workflow/approval-center');

  await expect(page.getByText('Fund Request #1')).toBeVisible();
  await page.getByRole('button', { name: '详情' }).first().click();
  await expect(page.getByText('审核轨迹')).toBeVisible();
  await expect(page.getByText('SUBMIT')).toBeVisible();

  await page.getByRole('textbox', { name: '意见说明' }).fill('approved in e2e');
  await page.getByRole('button', { name: '通过' }).click();

  await expect(page.locator('.approval-log strong').first()).toHaveText('APPROVE');
  await expect(page.getByText('approved in e2e')).toBeVisible();

  await page.getByText('我已审核', { exact: true }).click({ force: true });
  await expect(page.getByText('Fund Request #1')).toBeVisible();
});
