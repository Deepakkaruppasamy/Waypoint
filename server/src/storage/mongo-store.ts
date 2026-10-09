import { Collection, MongoClient } from 'mongodb';
import { PortalRecord, StoredUser } from '../models';
import { DataStore } from './data-store';

/** Mongo adds its own "_id" to every document; we hide it so both stores return the same shape. */
const WITHOUT_MONGO_ID = { projection: { _id: 0 } } as const;

export class MongoStore implements DataStore {
  readonly kind = 'MongoDB';

  private readonly client: MongoClient;
  private users!: Collection<StoredUser>;
  private records!: Collection<PortalRecord>;

  constructor(
    uri: string,
    private readonly dbName: string,
  ) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.users = db.collection<StoredUser>('users');
    this.records = db.collection<PortalRecord>('records');

    // Indexes make lookups fast and let the database itself reject duplicate user ids.
    await this.users.createIndex({ id: 1 }, { unique: true });
    await this.users.createIndex({ userId: 1 }, { unique: true });
    await this.records.createIndex({ ownerId: 1 });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  listUsers(): Promise<StoredUser[]> {
    return this.users.find({}, WITHOUT_MONGO_ID).sort({ createdAt: 1 }).toArray();
  }

  findUserById(id: string): Promise<StoredUser | null> {
    return this.users.findOne({ id }, WITHOUT_MONGO_ID);
  }

  findUserByUserId(userId: string): Promise<StoredUser | null> {
    return this.users.findOne({ userId }, WITHOUT_MONGO_ID);
  }

  async insertUser(user: StoredUser): Promise<void> {
    await this.users.insertOne({ ...user });
  }

  async updateUser(id: string, changes: Partial<StoredUser>): Promise<StoredUser | null> {
    const { id: _ignored, ...safeChanges } = changes;
    const result = await this.users.updateOne({ id }, { $set: safeChanges });
    return result.matchedCount === 1 ? this.findUserById(id) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.users.deleteOne({ id });
    return result.deletedCount === 1;
  }

  listRecords(): Promise<PortalRecord[]> {
    return this.records.find({}, WITHOUT_MONGO_ID).toArray();
  }

  async insertRecords(records: PortalRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.records.insertMany(records.map((record) => ({ ...record })));
  }

  async deleteRecordsByOwner(ownerId: string): Promise<void> {
    await this.records.deleteMany({ ownerId });
  }
}
