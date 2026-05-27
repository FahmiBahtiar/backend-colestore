/* eslint-disable */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding payment method configs...');

  const configs = [
    // Virtual Accounts (Default 24 hours expiry)
    {
      type: 'VIRTUAL_ACCOUNT',
      channel: 'BCA',
      name: 'BCA Virtual Account',
      paymentExpiryHours: 24,
    },
    {
      type: 'VIRTUAL_ACCOUNT',
      channel: 'BNI',
      name: 'BNI Virtual Account',
      paymentExpiryHours: 24,
    },
    {
      type: 'VIRTUAL_ACCOUNT',
      channel: 'BRI',
      name: 'BRI Virtual Account',
      paymentExpiryHours: 24,
    },
    {
      type: 'VIRTUAL_ACCOUNT',
      channel: 'MANDIRI',
      name: 'Mandiri Virtual Account',
      paymentExpiryHours: 24,
    },
    {
      type: 'VIRTUAL_ACCOUNT',
      channel: 'PERMATA',
      name: 'Permata Virtual Account',
      paymentExpiryHours: 24,
    },
    // QRIS (Default 1 hour expiry)
    { type: 'QR_CODE', channel: 'QRIS', name: 'QRIS', paymentExpiryHours: 1 },
    // E-Wallets (Default 1 hour expiry)
    { type: 'EWALLET', channel: 'OVO', name: 'OVO', paymentExpiryHours: 1 },
    { type: 'EWALLET', channel: 'DANA', name: 'DANA', paymentExpiryHours: 1 },
    {
      type: 'EWALLET',
      channel: 'SHOPEEPAY',
      name: 'ShopeePay',
      paymentExpiryHours: 1,
    },
    {
      type: 'EWALLET',
      channel: 'LINKAJA',
      name: 'LinkAja',
      paymentExpiryHours: 1,
    },
  ];

  for (const config of configs) {
    await prisma.paymentMethodConfig.upsert({
      where: {
        type_channel: {
          type: config.type,
          channel: config.channel,
        },
      },
      update: {},
      create: {
        type: config.type,
        channel: config.channel,
        name: config.name,
        isActive: true,
        paymentExpiryHours: config.paymentExpiryHours,
      },
    });
  }

  console.log('Payment method configs seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
