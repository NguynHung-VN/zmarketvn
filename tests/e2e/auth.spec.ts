import { test, expect } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test('Login as Buyer and see dashboard', async ({ page }) => {
    await page.goto('/dang-nhap')
    await page.fill('input[type="email"]', 'nguoimua@zmarket.vn')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')

    // Wait for redirect to home page or buyer dashboard
    await page.waitForURL('**/san-pham')
    await expect(page.locator('text=Nguyễn Văn Mua')).toBeVisible({ timeout: 10000 })
  })

  test('Login as Seller and see dashboard', async ({ page }) => {
    await page.goto('/dang-nhap')
    // Click on "Tiểu thương" fast login option to prefill or fill manually
    await page.fill('input[type="email"]', 'tieuthuong@zmarket.vn')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')

    await page.waitForURL('**/seller')
    await expect(page.locator('text=Tiểu thương')).toBeVisible({ timeout: 10000 })
  })

  test('Login as Shipper and see dashboard', async ({ page }) => {
    await page.goto('/dang-nhap')
    await page.fill('input[type="email"]', 'shipper@zmarket.vn')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')

    await page.waitForURL('**/shipper')
    await expect(page.locator('text=Shipper')).toBeVisible({ timeout: 10000 })
  })

  test('Login as Admin and see dashboard', async ({ page }) => {
    await page.goto('/dang-nhap')
    await page.fill('input[type="email"]', 'admin@123')
    await page.fill('input[type="password"]', 'admin@123')
    await page.click('button[type="submit"]')

    await page.waitForURL('**/admin')
    await expect(page.locator('text=Quản trị viên')).toBeVisible({ timeout: 10000 })
  })
})
