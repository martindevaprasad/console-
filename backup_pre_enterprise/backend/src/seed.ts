import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { name: 'Nexus Cafe Group' },
    update: {},
    create: {
      name: 'Nexus Cafe Group',
      type: 'CAFE',
      taxRate: 8.0,
      address: '789 Broadway Ave, New York, NY',
      phone: '+1 (555) 987-6543',
      email: 'hq@nexuscafe.com',
    },
  });

  console.log(`- Organization created: ${org.name} (${org.id})`);

  // 2. Create Owner User
  const ownerPassword = await bcrypt.hash('admin123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@nexuscafe.com' },
    update: {},
    create: {
      email: 'owner@nexuscafe.com',
      name: 'Martin Devaprasad',
      password: ownerPassword,
      role: 'OWNER',
      organizationId: org.id,
      phone: '+1 (555) 111-2222',
    },
  });

  console.log(`- Owner created: ${owner.name} (${owner.email})`);

  // 3. Create Locations
  const loc1 = await prisma.location.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Downtown Cafe' } },
    update: {},
    create: {
      name: 'Downtown Cafe',
      address: '123 Main St, New York, NY',
      phone: '+1 (555) 123-4567',
      email: 'downtown@nexuscafe.com',
      organizationId: org.id,
    },
  });

  const loc2 = await prisma.location.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Uptown Corner' } },
    update: {},
    create: {
      name: 'Uptown Corner',
      address: '456 Park Ave, New York, NY',
      phone: '+1 (555) 234-5678',
      email: 'uptown@nexuscafe.com',
      organizationId: org.id,
    },
  });

  console.log(`- Locations created: Downtown Cafe, Uptown Corner`);

  // 4. Create Departments
  const dept1 = await prisma.department.upsert({
    where: { locationId_name: { locationId: loc1.id, name: 'Main Counter' } },
    update: {},
    create: {
      name: 'Main Counter',
      description: 'Coffee brewing and register area',
      locationId: loc1.id,
    },
  });

  const dept2 = await prisma.department.upsert({
    where: { locationId_name: { locationId: loc1.id, name: 'Kitchen Area' } },
    update: {},
    create: {
      name: 'Kitchen Area',
      description: 'Kitchen and meal preparation area',
      locationId: loc1.id,
    },
  });

  console.log(`- Departments created: Main Counter, Kitchen Area`);

  // 5. Create Staff User
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@nexuscafe.com' },
    update: {},
    create: {
      email: 'staff@nexuscafe.com',
      name: 'Jane Doe',
      password: staffPassword,
      role: 'STAFF',
      organizationId: org.id,
      locationId: loc1.id,
      departmentId: dept1.id,
      phone: '+1 (555) 333-4444',
    },
  });

  console.log(`- Staff created: ${staff.name} (${staff.email})`);

  // 6. Categories
  const catCoffee = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Coffee & Drinks' } },
    update: {},
    create: {
      name: 'Coffee & Drinks',
      description: 'Artisanal espresso drinks and teas',
      color: '#7c3aed',
      organizationId: org.id,
    },
  });

  const catFood = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Bakery & Food' } },
    update: {},
    create: {
      name: 'Bakery & Food',
      description: 'Croissants, cakes, and sandwiches',
      color: '#06b6d4',
      organizationId: org.id,
    },
  });

  console.log(`- Categories created: Coffee & Drinks, Bakery & Food`);

  // 7. Products
  const products = [
    { name: 'Espresso Double', price: 3.5, categoryId: catCoffee.id },
    { name: 'Vanilla Latte', price: 4.8, categoryId: catCoffee.id },
    { name: 'Cappuccino Latte', price: 4.5, categoryId: catCoffee.id },
    { name: 'Butter Croissant', price: 3.8, categoryId: catFood.id },
    { name: 'Chocolate Muffin', price: 4.2, categoryId: catFood.id },
    { name: 'Avocado Toast', price: 9.5, categoryId: catFood.id },
  ];

  for (const prod of products) {
    const createdProd = await prisma.product.upsert({
      where: { id: `seed-${prod.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${prod.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: prod.name,
        price: prod.price,
        organizationId: org.id,
        categoryId: prod.categoryId,
        sku: `SKU-${prod.name.toUpperCase().substring(0, 3)}-01`,
        cost: prod.price * 0.3, // 30% food cost
      },
    });

    // Seed inventory for downtown location
    await prisma.inventory.upsert({
      where: { productId_locationId: { productId: createdProd.id, locationId: loc1.id } },
      update: {},
      create: {
        productId: createdProd.id,
        locationId: loc1.id,
        quantity: 50,
        minStock: 10,
      },
    });

    // Seed inventory for uptown location
    await prisma.inventory.upsert({
      where: { productId_locationId: { productId: createdProd.id, locationId: loc2.id } },
      update: {},
      create: {
        productId: createdProd.id,
        locationId: loc2.id,
        quantity: 25,
        minStock: 5,
      },
    });
  }

  console.log(`- Products and inventory seeded successfully.`);
  console.log('Seeding finished successfully! 🎉');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
