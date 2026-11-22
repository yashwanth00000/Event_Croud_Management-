import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
const prisma = new PrismaClient();
const rl = createInterface({ input, output });
try {
  const fullName = (await rl.question('Admin full name: ')).trim();
  const email = (await rl.question('Admin email: ')).trim().toLowerCase();
  const password = await rl.question('Admin password (minimum 12 characters): ');
  if (fullName.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) throw new Error('Invalid name/email or password too short.');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const role = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN', description: 'System administrator' } });
  const user = await prisma.user.create({ data: { fullName, email, passwordHash, roles: { create: { roleId: role.id } } }, select: { id: true, fullName: true, email: true } });
  console.log(`Created administrator: ${user.fullName} <${user.email}>`);
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
finally { rl.close(); await prisma.$disconnect(); }
