import { PortalRecord, StoredUser } from '../models';

/**
 * The contract every storage backend implements.
 *
 * Routes only ever talk to this interface, so switching between the XML file,
 * the JSON file, MongoDB and DynamoDB needs no change outside the storage folder.
 */
export interface DataStore {
  /** Human-readable name, reported by GET /api/health */
  readonly kind: string;

  connect(): Promise<void>;
  close(): Promise<void>;

  listUsers(): Promise<StoredUser[]>;
  findUserById(id: string): Promise<StoredUser | null>;
  /** Exact match. User ids are always stored in lower case (see the routes). */
  findUserByUserId(userId: string): Promise<StoredUser | null>;
  insertUser(user: StoredUser): Promise<void>;
  updateUser(id: string, changes: Partial<StoredUser>): Promise<StoredUser | null>;
  deleteUser(id: string): Promise<boolean>;

  listRecords(): Promise<PortalRecord[]>;
  insertRecords(records: PortalRecord[]): Promise<void>;
  /** Removes a user's records when the user is deleted. */
  deleteRecordsByOwner(ownerId: string): Promise<void>;
}
