import { test, expect } from '@playwright/test'

test.describe('Checkout Flow E2E Test', () => {
  test('Buyer checkout COD flow', async ({ page }) => {
    test.setTimeout(60000) // 60s for the full checkout flow

    // Listen to console logs
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`)
    })

    // Listen to all failed responses
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[HTTP ERROR] ${response.url()} status ${response.status()}`)
        response.text().then(text => console.log(`[HTTP ERROR BODY]:`, text)).catch(() => {})
      }
    })

    // 1. Login as Buyer
    await page.goto('/dang-nhap')
    await page.fill('input[type="email"]', 'nguoimua@zmarket.vn')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/san-pham')

    // 2. Go to product listing
    await page.goto('/san-pham')
    
    // 3. Click on the first product "Xem chi tiết" link
    const firstProduct = page.locator('button:has-text("Xem chi tiết")').first()
    await expect(firstProduct).toBeVisible({ timeout: 10000 })
    await firstProduct.click()

    // 4. On Product detail dialog, click "Thêm vào giỏ"
    const addToCartBtn = page.locator('[role="dialog"] button:has-text("Thêm vào giỏ")')
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 })
    await addToCartBtn.click()
    
    // Wait for toast notification
    await expect(page.locator('text=Đã thêm vào giỏ hàng')).toBeVisible({ timeout: 10000 })

    // 5. Close the product detail dialog by pressing Escape
    await page.keyboard.press('Escape')
    // Wait for dialog overlay to disappear
    await expect(page.locator('[data-slot="dialog-overlay"]')).not.toBeVisible({ timeout: 5000 })

    // 6. Navigate to Cart page directly
    await page.goto('/gio-hang')

    // 7. Wait for cart to load with items (delivery form visible means cart has items)
    await expect(page.locator('text=Thông tin giao hàng')).toBeVisible({ timeout: 15000 })

    // 8. Fill delivery details
    await page.fill('input[placeholder="Họ và tên"]', 'Nguyễn Văn Mua')
    await page.fill('input[placeholder="Số nhà, đường, quận..."]', '123 Đường Bưởi, Hà Nội')
    await page.fill('input[placeholder="0901234567"]', '0987654321')

    // 9. Click "Đặt hàng (COD)"
    const placeOrderBtn = page.locator('button:has-text("Đặt hàng (COD)")')
    await expect(placeOrderBtn).toBeVisible({ timeout: 10000 })
    await placeOrderBtn.click()

    // 10. Verify order success — should redirect to /don-hang
    await page.waitForURL('**/don-hang', { timeout: 15000 })
    await expect(page.locator('h2:has-text("Đơn hàng")')).toBeVisible({ timeout: 15000 })
  })
})
