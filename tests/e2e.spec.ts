import { test, expect } from '@playwright/test';

test.describe('Hosflow E2E Functional Audit', () => {

  test('Flow A: Reception Intake creates a new patient', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Sign out from default Doctor role
    await page.getByTestId('sign-out-btn').click();
    
    // Login as Reception
    await expect(page.locator('text=Emergency Intake & Reception')).toBeVisible();
    await page.locator('text=Emergency Intake & Reception').click();
    await page.locator('button:has-text("Authenticate")').click();

    // Intercept backend request
    const patientPostPromise = page.waitForResponse(response => 
      response.url().includes('/api/patients') && response.request().method() === 'POST'
    );

    // Navigate to Reception via sidebar
    await page.locator('nav').locator('text=Reception & Intake Desk').click();

    // Ensure we are on Reception Intake
    await expect(page.locator('text=Front Intake & Emergency Desk')).toBeVisible();

    // Click on Generate Admission to open the modal
    await page.locator('button:has-text("+ New Registration")').click();

    // Fill the intake form
    await page.getByPlaceholder('e.g. Harish Mehta').fill('E2E Test Patient');
    await page.getByPlaceholder('61').fill('45');
    await page.locator('select').first().selectOption('M'); // Gender select
    await page.getByPlaceholder('e.g. Acute abdominal pain, post-op observation').fill('E2E Audit Testing');
    
    // Select Department/Ward (might be a select)
    // Actually, in the modal, let's just submit with the default options
    await page.locator('button:has-text("Generate Admission & QR Pass")').click();

    // Wait for network response
    const response = await patientPostPromise;
    expect(response.status()).toBe(201); // Created

    // Verify UI reflects the change (Toast notification)
    await expect(page.locator('text=Generated Patient Portal QR Pass')).toBeVisible();
  });

  test('Flow B: Bed Matrix Turnover updates bed status via API', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Sign out from default Doctor role
    await page.getByTestId('sign-out-btn').click();
    
    // Login as Bed Turnover Logistics
    await expect(page.locator('text=Bed Turnover & Logistics')).toBeVisible();
    await page.locator('text=Bed Turnover & Logistics').click();
    await page.locator('button:has-text("Authenticate")').click();

    // Navigate to Bed Matrix
    await page.locator('nav').locator('text=Bed Matrix & Turnover').click();

    // Intercept backend request
    const bedPatchPromise = page.waitForResponse(response => 
      response.url().includes('/api/beds/') && response.request().method() === 'PATCH'
    );

    // Click "Simulate Bed Turnover" button
    await page.locator('button:has-text("Simulate Bed Turnover")').first().click();

    // Wait for the PATCH request to succeed
    const response = await bedPatchPromise;
    expect(response.status()).toBe(200);

    // Wait for toast confirming it
    await expect(page.locator('text=Bed').first()).toBeVisible();
  });
});
