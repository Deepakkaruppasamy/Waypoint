import {
  ConditionalCheckFailedException,
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  BatchWriteCommandOutput,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { PortalRecord, StoredUser } from '../models';
import { DataStore } from './data-store';

export interface DynamoOptions {
  region: string;
  tablePrefix: string;
  /** Only for a local emulator, e.g. http://localhost:8000. Leave empty for real AWS. */
  endpoint?: string;
}

const USER_ID_INDEX = 'userId-index';
const OWNER_INDEX = 'ownerId-index';
const BATCH_LIMIT = 25; // DynamoDB accepts at most 25 writes per batch

/**
 * Stores data in two AWS DynamoDB tables.
 *
 *   <prefix>-users     key: id     index: userId   (find a user at login)
 *   <prefix>-records   key: id     index: ownerId  (find one user's records)
 *
 * DynamoDB can only look items up by key. A "global secondary index" is a
 * second, automatically maintained copy of the table keyed by another
 * field, which is what makes the userId and ownerId lookups fast.
 *
 * Missing tables are created at start-up with on-demand billing, so there
 * is nothing to set up in the AWS console.
 */
export class DynamoStore implements DataStore {
  readonly kind = 'AWS DynamoDB';

  private readonly client: DynamoDBClient;
  private readonly doc: DynamoDBDocumentClient;
  private readonly usersTable: string;
  private readonly recordsTable: string;

  constructor(options: DynamoOptions) {
    this.client = new DynamoDBClient({
      region: options.region,
      endpoint: options.endpoint,
      // A local emulator does not check credentials, but the SDK insists on having some.
      ...(options.endpoint && !process.env.AWS_ACCESS_KEY_ID
        ? { credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
        : {}),
    });
    this.doc = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.usersTable = `${options.tablePrefix}-users`;
    this.recordsTable = `${options.tablePrefix}-records`;
  }

  async connect(): Promise<void> {
    await this.ensureTable(this.usersTable, USER_ID_INDEX, 'userId');
    await this.ensureTable(this.recordsTable, OWNER_INDEX, 'ownerId');
  }

  async close(): Promise<void> {
    this.client.destroy();
  }

  // ---------------------------------------------------------------- users

  async listUsers(): Promise<StoredUser[]> {
    const users = await this.scanAll<StoredUser>(this.usersTable);
    return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    const result = await this.doc.send(
      new GetCommand({ TableName: this.usersTable, Key: { id }, ConsistentRead: true }),
    );
    return (result.Item as StoredUser | undefined) ?? null;
  }

  async findUserByUserId(userId: string): Promise<StoredUser | null> {
    const result = await this.doc.send(
      new QueryCommand({
        TableName: this.usersTable,
        IndexName: USER_ID_INDEX,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Limit: 1,
      }),
    );
    return (result.Items?.[0] as StoredUser | undefined) ?? null;
  }

  async insertUser(user: StoredUser): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.usersTable,
        Item: user,
        ConditionExpression: 'attribute_not_exists(id)', // never overwrite an existing user
      }),
    );
  }

  async updateUser(id: string, changes: Partial<StoredUser>): Promise<StoredUser | null> {
    const fields = Object.entries(changes).filter(([key, value]) => key !== 'id' && value !== undefined);
    if (fields.length === 0) return this.findUserById(id);

    // Builds "SET #f0 = :v0, #f1 = :v1". The #/: placeholders are needed
    // because "name" and "role" are reserved words in DynamoDB.
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const assignments = fields.map(([key, value], index) => {
      names[`#f${index}`] = key;
      values[`:v${index}`] = value;
      return `#f${index} = :v${index}`;
    });

    try {
      const result = await this.doc.send(
        new UpdateCommand({
          TableName: this.usersTable,
          Key: { id },
          UpdateExpression: `SET ${assignments.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: 'attribute_exists(id)', // do not create a user by accident
          ReturnValues: 'ALL_NEW',
        }),
      );
      return result.Attributes as StoredUser;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return null;
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.doc.send(
      new DeleteCommand({ TableName: this.usersTable, Key: { id }, ReturnValues: 'ALL_OLD' }),
    );
    return result.Attributes !== undefined;
  }

  // -------------------------------------------------------------- records

  listRecords(): Promise<PortalRecord[]> {
    return this.scanAll<PortalRecord>(this.recordsTable);
  }

  async insertRecords(records: PortalRecord[]): Promise<void> {
    await this.batchWrite(records.map((record) => ({ PutRequest: { Item: record } })));
  }

  async deleteRecordsByOwner(ownerId: string): Promise<void> {
    const ids: string[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await this.doc.send(
        new QueryCommand({
          TableName: this.recordsTable,
          IndexName: OWNER_INDEX,
          KeyConditionExpression: 'ownerId = :ownerId',
          ExpressionAttributeValues: { ':ownerId': ownerId },
          ProjectionExpression: 'id',
          ExclusiveStartKey: startKey,
        }),
      );
      ids.push(...(page.Items ?? []).map((item) => item['id'] as string));
      startKey = page.LastEvaluatedKey;
    } while (startKey);

    await this.batchWrite(ids.map((id) => ({ DeleteRequest: { Key: { id } } })));
  }

  // -------------------------------------------------------------- helpers

  /** Reads a whole table. A scan returns at most 1 MB per call, so keep going until done. */
  private async scanAll<T>(tableName: string): Promise<T[]> {
    const items: T[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await this.doc.send(
        new ScanCommand({ TableName: tableName, ExclusiveStartKey: startKey }),
      );
      items.push(...((page.Items ?? []) as T[]));
      startKey = page.LastEvaluatedKey;
    } while (startKey);
    return items;
  }

  /** Sends writes in groups of 25 and retries anything DynamoDB reports as not yet processed. */
  private async batchWrite(requests: Record<string, unknown>[]): Promise<void> {
    for (let start = 0; start < requests.length; start += BATCH_LIMIT) {
      let pending: Record<string, unknown>[] | undefined = requests.slice(start, start + BATCH_LIMIT);
      for (let attempt = 0; pending?.length; attempt++) {
        if (attempt > 5) throw new Error('DynamoDB did not accept a batch write after several tries.');
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
        const result: BatchWriteCommandOutput = await this.doc.send(
          new BatchWriteCommand({ RequestItems: { [this.recordsTable]: pending } }),
        );
        pending = result.UnprocessedItems?.[this.recordsTable];
      }
    }
  }

  /** Creates the table (with its index) if it is not there yet, then waits until it is usable. */
  private async ensureTable(tableName: string, indexName: string, indexField: string): Promise<void> {
    try {
      await this.client.send(new DescribeTableCommand({ TableName: tableName }));
      return;
    } catch (error) {
      if (!(error instanceof ResourceNotFoundException)) throw error;
    }

    const definition: CreateTableCommandInput = {
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST', // pay per request, nothing to provision
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: indexField, AttributeType: 'S' },
      ],
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      GlobalSecondaryIndexes: [
        {
          IndexName: indexName,
          KeySchema: [{ AttributeName: indexField, KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    };
    console.log(`DynamoDB: creating table "${tableName}"...`);
    await this.client.send(new CreateTableCommand(definition));
    await waitUntilTableExists(
      { client: this.client, maxWaitTime: 120, minDelay: 1, maxDelay: 5 },
      { TableName: tableName },
    );
  }
}
