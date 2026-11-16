import { expect, test } from '@playwright/test';

test('el catálogo permite buscar, filtrar y consultar detalles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lo esencial. A tu manera.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/tienda-mobile.png', fullPage: true });
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('termo');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ver detalles de Termo Essential' }).click();
  await expect(page.getByRole('region', { name: 'Detalles del producto' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar detalles' }).click();
  await page.getByRole('searchbox').clear();
  await page.getByRole('button', { name: 'Tecnología', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
});

test('completa una compra simulada, conserva carrito y pedidos y registra la entrega', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Añadir Mochila Urbana', exact: true }).click();
  await page.getByRole('link', { name: 'Ver carrito', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen del pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Sumar una unidad de Mochila Urbana' }).click();
  await expect(page.locator('.summary .total')).toContainText('259,800');
  await page.reload();
  await expect(page.locator('.quantity')).toContainText('2');
  await page.getByRole('link', { name: 'Inicia sesión para continuar' }).click();
  await page.getByRole('button', { name: 'Entrar a la demostración' }).click();
  await page.getByRole('button', { name: 'Simular compra', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¡Tu pedido está registrado!' })).toBeVisible();
  await expect(page.locator('.receipt')).toContainText('259,800');
  await page.getByRole('link', { name: 'Ver mis pedidos', exact: true }).click();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await expect(page.locator('.order-card')).toContainText('2 × Mochila Urbana');
  await page.getByRole('button', { name: 'Marcar entregado', exact: true }).click();
  await expect(page.locator('.status')).toHaveText('Entregado');
  await page.getByRole('link', { name: 'Fotografiar evidencia' }).click();
  await expect(page.getByRole('heading', { name: 'Evidencias de entrega' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tomar fotografía' })).toBeEnabled();
  await expect(page.getByText('Pedido asociado:')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/cuenta/);
  await page.getByRole('button', { name: 'Entrar a la demostración' }).click();
  await page.goto('/tabs/pedidos');
  // La sesión es de memoria: navegar en la app conserva el acceso; recargar exige reingreso.
  await expect(page).toHaveURL(/cuenta/);
  await page.getByRole('button', { name: 'Entrar a la demostración' }).click();
  await page.getByRole('tab', { name: 'Pedidos' }).click();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await expect(page.locator('.status')).toHaveText('Entregado');
});

test('las rutas de pedidos y logística requieren sesión', async ({ page }) => {
  await page.goto('/tabs/pedidos');
  await expect(page).toHaveURL(/cuenta/);
  await page.goto('/tabs/evidencias');
  await expect(page).toHaveURL(/cuenta/);
  await expect(page.getByRole('button', { name: 'Entrar a la demostración' })).toBeVisible();
});

test('el diseño se ajusta a escritorio sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/tienda-desktop.png', fullPage: true });
});
