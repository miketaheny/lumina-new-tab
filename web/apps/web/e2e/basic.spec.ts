import { test, expect } from '@playwright/test';

test.describe('Lumina Web Companion', () => {
  test('page loads with main layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#app')).toBeVisible();
  });

  test('clock is visible', async ({ page }) => {
    await page.goto('/');
    // Clock renders time in #clock and date in #date
    await expect(page.locator('#clock')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#date')).toBeVisible({ timeout: 10000 });
  });

  test('search bar is present and functional', async ({ page }) => {
    await page.goto('/');
    // SearchBar renders an input with placeholder "Search…" (ellipsis character)
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });

  test('settings panel opens via FAB button', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.getByRole('button', { name: /toggle settings panel/i });
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();
    // SettingsPanel slides in — look for the "Themes" tab label which is always the default tab
    await expect(page.getByRole('button', { name: 'Themes' })).toBeVisible({ timeout: 5000 });
  });

  test('notes panel opens via FAB button', async ({ page }) => {
    await page.goto('/');
    const notesBtn = page.getByRole('button', { name: /toggle notes panel/i });
    await expect(notesBtn).toBeVisible({ timeout: 10000 });
    await notesBtn.click();
    // NotesPanel slides in — look for the "Notes" main tab button inside the panel
    await expect(page.getByRole('button', { name: 'Notes' }).first()).toBeVisible({ timeout: 5000 });
  });
});
