// One-off migration for data created before the enterprise upgrade.
// Safe to run multiple times: every step only touches rows still in the legacy shape.
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { buildSettings, resolveSettings } from '../lib/templates';

async function main() {
  // 1. Legacy orders were always created COMPLETED with no Payment rows.
  const legacy = await prisma.order.findMany({
    where: { status: 'COMPLETED', paidAmount: 0, payments: { none: {} } },
    select: { id: true, total: true, paymentMethod: true, userId: true, createdAt: true },
  });
  for (const o of legacy) {
    await prisma.$transaction([
      prisma.payment.create({
        data: { orderId: o.id, type: 'SALE', method: o.paymentMethod === 'SPLIT' ? 'OTHER' : o.paymentMethod, amount: o.total, userId: o.userId, createdAt: o.createdAt },
      }),
      prisma.order.update({ where: { id: o.id }, data: { paymentStatus: 'PAID', paidAmount: o.total, completedAt: o.createdAt } }),
      prisma.orderItem.updateMany({ where: { orderId: o.id, status: 'PENDING' }, data: { status: 'SERVED' } }),
    ]);
  }
  console.log(`- Backfilled ${legacy.length} legacy orders with payments`);

  // 2. Legacy cancelled orders: void their items.
  const cancelled = await prisma.orderItem.updateMany({ where: { order: { status: 'CANCELLED' }, status: { not: 'VOIDED' } }, data: { status: 'VOIDED' } });
  console.log(`- Voided ${cancelled.count} items on cancelled orders`);

  // 3. Snapshot item names (receipts must not change when a product is renamed).
  const unnamed = await prisma.orderItem.findMany({ where: { name: null }, include: { product: { select: { name: true } } } });
  for (const i of unnamed) await prisma.orderItem.update({ where: { id: i.id }, data: { name: i.product.name } });
  console.log(`- Named ${unnamed.length} order items`);

  // 4. Organizations without settings get their format's template; each gets a default tax rate.
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    const current = org.settings as any;
    if (!current || !Object.keys(current).length) {
      await prisma.organization.update({ where: { id: org.id }, data: { settings: buildSettings(org.type, org.size) as any } });
    }
    const hasTax = await prisma.taxRate.count({ where: { organizationId: org.id } });
    if (!hasTax) {
      const t = await prisma.taxRate.create({ data: { organizationId: org.id, name: resolveSettings(org.settings).taxLabel, rate: org.taxRate, isDefault: true } });
      await prisma.product.updateMany({ where: { organizationId: org.id, taxRateId: null }, data: { taxRateId: t.id } });
    }
    // Orgs that already have locations were set up before onboarding existed.
    if (!org.onboardingCompleted && (await prisma.location.count({ where: { organizationId: org.id } }))) {
      await prisma.organization.update({ where: { id: org.id }, data: { onboardingCompleted: true } });
    }
    const hq = await prisma.location.findFirst({ where: { organizationId: org.id, isHeadOffice: true } });
    if (!hq) {
      const first = await prisma.location.findFirst({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' } });
      if (first) await prisma.location.update({ where: { id: first.id }, data: { isHeadOffice: true } });
    }
  }
  console.log(`- Configured ${orgs.length} organizations`);
  console.log('Backfill complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
