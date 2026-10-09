import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AccessLevel, PortalRecord, RecordStatus, Role, StoredUser } from './models';
import { DataStore } from './storage';

interface SeedUser {
  userId: string;
  password: string;
  name: string;
  email: string;
  department: string;
  role: Role;
}

/** Demo accounts. They are listed in the README so reviewers can sign in. */
const SEED_USERS: SeedUser[] = [
  { userId: 'deepak', password: 'Admin@123', name: 'Deepak', email: 'deepak@example.com', department: 'Platform', role: 'Admin' },
  { userId: 'deep', password: 'User@123', name: 'Deep', email: 'deep@example.com', department: 'Finance', role: 'General User' },
];

type SeedRecord = [title: string, category: string, ownerId: string, accessLevel: AccessLevel, status: RecordStatus, daysAgo: number];

const SEED_RECORDS: SeedRecord[] = [
  ['Travel reimbursement - Chennai visit', 'Expense', 'deep', 'General', 'Approved', 2],
  ['Laptop replacement request', 'Asset', 'deep', 'General', 'In Review', 5],
  ['Q3 vendor invoice reconciliation', 'Finance', 'deep', 'General', 'Open', 1],
  ['Annual leave - Pongal week', 'Leave', 'deep', 'General', 'Approved', 12],
  ['Warehouse access badge renewal', 'Access', 'deepak', 'General', 'Open', 3],
  ['Shift roster change - November', 'Operations', 'deepak', 'General', 'In Review', 4],
  ['Safety training certificate', 'Compliance', 'deepak', 'General', 'Closed', 20],
  ['Team offsite budget estimate', 'Expense', 'deepak', 'General', 'Open', 6],
  ['Salary revision sheet FY26', 'Payroll', 'deepak', 'Admin', 'In Review', 1],
  ['Security audit findings', 'Compliance', 'deepak', 'Admin', 'Open', 7],
  ['Vendor contract - cloud hosting', 'Legal', 'deepak', 'Admin', 'Approved', 15],
  ['Access review: Finance team', 'Access', 'deep', 'Admin', 'Open', 2],
  ['Incident report: warehouse outage', 'Operations', 'deepak', 'Admin', 'Closed', 9],
  ['New joiner onboarding checklist', 'HR', 'deepak', 'General', 'Approved', 30],
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Fills an empty database with demo users and records. Does nothing if users already exist. */
export async function seedIfEmpty(store: DataStore): Promise<boolean> {
  const existing = await store.listUsers();
  if (existing.length > 0) return false;

  for (const [index, seed] of SEED_USERS.entries()) {
    const user: StoredUser = {
      id: randomUUID(),
      userId: seed.userId,
      name: seed.name,
      email: seed.email,
      department: seed.department,
      role: seed.role,
      passwordHash: await bcrypt.hash(seed.password, 10),
      createdAt: daysAgo(90 - index * 20),
    };
    await store.insertUser(user);
  }

  const records: PortalRecord[] = SEED_RECORDS.map(
    ([title, category, ownerId, accessLevel, status, age], index) => ({
      id: `REC-${String(1001 + index)}`,
      title,
      category,
      ownerId,
      accessLevel,
      status,
      updatedAt: daysAgo(age),
    }),
  );
  await store.insertRecords(records);
  return true;
}
