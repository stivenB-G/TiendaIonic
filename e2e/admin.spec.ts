import { expect, test } from '@playwright/test';

test('el administrador publica productos con foto, edita y conserva los cambios', async ({ page }) => {
  await page.goto('/tabs/cuenta');
  await page.getByRole('button', { name: 'Probar administración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gestiona tus productos' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Administrar' })).toBeVisible();
  await page.getByLabel('Nombre', { exact: false }).fill('Morral artesanal');
  await page.getByLabel('Categoría', { exact: false }).fill('Hecho a mano');
  await page
    .getByLabel('Descripción', { exact: false })
    .fill('Morral tejido a mano con bolsillo interior y correa ajustable.');
  await page.getByLabel('Precio (COP)', { exact: false }).fill('129000');
  await page.getByLabel('Unidades disponibles', { exact: false }).fill('7');
  await page.locator('#product-photo').setInputFiles('src/assets/icon/favicon.png');
  await expect(page.getByRole('img', { name: 'Vista previa de la fotografía del producto' })).toBeVisible();
  await page.getByRole('button', { name: 'Publicar producto', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Producto creado.');
  await expect(page.locator('.admin-product').filter({ hasText: 'Morral artesanal' })).toContainText(
    '7 unidades disponibles',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Ver tienda', exact: false }).click();
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('Morral artesanal');
  const image = page.getByRole('img', { name: 'Morral artesanal', exact: true });
  await expect(image).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Añadir Morral artesanal', exact: true }).click();
  await page.getByRole('link', { name: 'Ver carrito', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Productos del carrito' })
      .getByRole('img', { name: 'Morral artesanal', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Administrar' }).click();
  await page.getByRole('button', { name: 'Editar Morral artesanal', exact: true }).click();
  await page.getByLabel('Precio (COP)', { exact: false }).fill('149900');
  await page.getByLabel('Unidades disponibles', { exact: false }).fill('0');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Producto actualizado.');
  await page.reload();
  await expect(page).toHaveURL(/cuenta/);
  await page.getByRole('button', { name: 'Probar administración', exact: true }).click();
  const product = page.locator('.admin-product').filter({ hasText: 'Morral artesanal' });
  await expect(product).toContainText('0 unidades disponibles');
  await expect(product).toContainText('149,900');
  await expect(product.getByRole('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await page.getByRole('link', { name: 'Ver tienda', exact: false }).click();
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('Morral artesanal');
  await expect(page.getByRole('button', { name: 'Añadir Morral artesanal', exact: true })).toBeDisabled();
  await expect(page.locator('.product-card')).toContainText('Agotado');
});

test('protege el panel y rechaza archivos que no son imágenes permitidas', async ({ page }) => {
  await page.goto('/tabs/admin');
  await expect(page).toHaveURL(/cuenta/);
  await expect(page.getByRole('tab', { name: 'Administrar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Entrar a la demostración', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Administrar' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Mi cuenta' }).click();
  await page.getByRole('button', { name: 'Probar administración', exact: true }).click();
  await page
    .locator('#product-photo')
    .setInputFiles({ name: 'documento.txt', mimeType: 'text/plain', buffer: Buffer.from('Esto no es una fotografía') });
  await expect(page.getByRole('alert')).toContainText('JPG, PNG o WebP');
  await expect(page.getByRole('button', { name: 'Publicar producto', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: 'Mi cuenta' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Administrar' })).toHaveCount(0);
});
