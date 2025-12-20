import { test } from '@playwright/test';
import { DbUtils } from '../../utils/db-utils';
import { UserUtils } from '../../utils/user-utils';

test.describe('User Registration Flow', () => {
  test.beforeEach(async () => {
    await DbUtils.cleanCollection(UserUtils.DB_NAME);
  });

  test.afterAll(async () => {
    await DbUtils.closeConnection();
  });

  test('login user', async ({ page }) => {
    await UserUtils.create({ email: 'jguillermo@mail.com' });
    await page.goto('/sign-in');
    await page.locator("input[data-testid='sign-in-email']").fill('jguillermo@mail.com');
    await page.locator("input[data-testid='sign-in-password']").fill('12345678');
    await page.locator("button[ng-reflect-color='primary']").click();
    await page.waitForURL('/example');
  });

  test('login error password', async ({ page }) => {
    await UserUtils.create({ email: 'jguillermo@mail.com' });
    await page.goto('/sign-in');
    await page.locator("input[data-testid='sign-in-email']").fill('jguillermo@mail.com');
    await page.locator("input[data-testid='sign-in-password']").fill('error');
    await page.locator("button[ng-reflect-color='primary']").click();
    await page.locator("fuse-alert[ng-reflect-type='error']").first().isVisible();
  });
});
