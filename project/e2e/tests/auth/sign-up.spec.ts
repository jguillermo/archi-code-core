import { expect, test } from '@playwright/test';
import { DbUtils } from '../../utils/db-utils';
import { UserUtils } from '../../utils/user-utils';

test.describe('User Registration Flow', () => {
  test.beforeEach(async () => {
    await DbUtils.cleanCollection('auth_user');
  });

  test.afterAll(async () => {
    await DbUtils.closeConnection();
  });

  test('register user', async ({ page }) => {
    await page.goto('/sign-up');
    await page.getByTestId('sign-up-name').fill('jose');
    await page.getByTestId('sign-up-email').fill('jguillermo@mail.com');
    await page.getByTestId('sign-up-password').fill('123456');
    await page.getByTestId('sign-up-submit').click();
    await page.waitForURL('/confirmation-required');
  });

  test('register user if email existe', async ({ page }) => {
    await UserUtils.create({ email: 'jose@mail.com' });
    await page.goto('/sign-up');
    await page.getByTestId('sign-up-name').fill('jose');
    await page.getByTestId('sign-up-email').fill('jose@mail.com');
    await page.getByTestId('sign-up-password').fill('123456');
    await page.getByTestId('sign-up-submit').click();

    const message = await page.locator("div[class^='fuse-alert-message']").first().textContent();
    expect(message?.trim()).toBe('User already exists');

    await page.locator("fuse-alert[ng-reflect-type='error']").first().isVisible();
  });
});
