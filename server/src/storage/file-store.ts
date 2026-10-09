import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PortalRecord, StoredUser } from '../models';
import { DataStore } from './data-store';

export interface FileDatabase {
  users: StoredUser[];
  records: PortalRecord[];
}

/**
 * Shared logic for stores that keep everything in one file on disk.
 *
 * The file is read once at start-up and held in memory. Every change is
 * written back through a queue, so two requests can never write at once
 * and leave a half-written file behind.
 *
 * Subclasses only decide the file format: how to turn the data into text
 * (serialize) and back (parse).
 */
export abstract class FileStore implements DataStore {
  abstract readonly kind: string;

  protected abstract parse(text: string): FileDatabase;
  protected abstract serialize(db: FileDatabase): string;

  private db: FileDatabase = { users: [], records: [] };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async connect(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      this.db = this.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.save(); // first run: create an empty file
    }
  }

  async close(): Promise<void> {
    await this.writeQueue;
  }

  async listUsers(): Promise<StoredUser[]> {
    return this.db.users.map((user) => ({ ...user }));
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    const user = this.db.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  async findUserByUserId(userId: string): Promise<StoredUser | null> {
    const user = this.db.users.find((u) => u.userId === userId);
    return user ? { ...user } : null;
  }

  async insertUser(user: StoredUser): Promise<void> {
    this.db.users.push({ ...user });
    await this.save();
  }

  async updateUser(id: string, changes: Partial<StoredUser>): Promise<StoredUser | null> {
    const index = this.db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.db.users[index] = { ...this.db.users[index], ...changes, id };
    await this.save();
    return { ...this.db.users[index] };
  }

  async deleteUser(id: string): Promise<boolean> {
    const before = this.db.users.length;
    this.db.users = this.db.users.filter((u) => u.id !== id);
    if (this.db.users.length === before) return false;
    await this.save();
    return true;
  }

  async listRecords(): Promise<PortalRecord[]> {
    return this.db.records.map((record) => ({ ...record }));
  }

  async insertRecords(records: PortalRecord[]): Promise<void> {
    this.db.records.push(...records.map((record) => ({ ...record })));
    await this.save();
  }

  async deleteRecordsByOwner(ownerId: string): Promise<void> {
    this.db.records = this.db.records.filter((r) => r.ownerId !== ownerId);
    await this.save();
  }

  /** Write to a temporary file first, then rename it over the real one. */
  private save(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tempFile = `${this.filePath}.tmp`;
      await fs.writeFile(tempFile, this.serialize(this.db), 'utf8');
      await fs.rename(tempFile, this.filePath);
    });
    return this.writeQueue;
  }
}
