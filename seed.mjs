import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Checking if data exists...');
  const count = await db.patient.count();
  if (count > 0) {
    console.log(`Already have ${count} patients. Skipping seed.`);
    return;
  }
  console.log('No data found. Please start the dev server and visit the app to seed data via the Demo Login button.');
}

main().catch(console.error).finally(() => db.$disconnect());
