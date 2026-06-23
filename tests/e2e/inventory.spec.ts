import { test, expect } from '@playwright/test'

test.describe('Seller Inventory E2E Test', () => {
  test('Seller can import stock successfully', async ({ page }) => {
    // 1. Login as Seller
    await page.goto('/dang-nhap')
    await page.fill('input[type="email"]', 'tieuthuong@zmarket.vn')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/seller')

    // 2. Go to /seller/kho
    await page.goto('/seller/kho')
    await expect(page.locator('text=Quản lý kho')).toBeVisible({ timeout: 10000 })

    // 3. Get the initial stock of the first item
    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })
    
    // Click "+ Nhập kho" button on the first row
    const importBtn = firstRow.locator('button:has-text("+ Nhập kho")')
    await expect(importBtn).toBeVisible()
    await importBtn.click()

    // 4. Verify modal is visible, type quantity
    const modalHeader = page.locator('h2:has-text("Nhập kho:")')
    await expect(modalHeader).toBeVisible()
    
    const qtyInput = page.locator('input[placeholder="Số lượng nhập"]')
    await qtyInput.fill('15')

    // 5. Click "Xác nhận"
    const confirmBtn = page.locator('button:has-text("Xác nhận")')
    await confirmBtn.click()

    // 6. Verify modal closes
    await expect(modalHeader).not.toBeVisible({ timeout: 5000 })
  })
})
