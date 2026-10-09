import 'dotenv/config';

export const STORAGE_KINDS = ['xml', 'json', 'mongo', 'dynamo'] as const;
export type StorageKind = (typeof STORAGE_KINDS)[number];

function readStorageKind(): StorageKind {
  const value = (process.env.STORAGE ?? 'xml').toLowerCase();
  if (!STORAGE_KINDS.includes(value as StorageKind)) {
    throw new Error(`STORAGE must be one of ${STORAGE_KINDS.join(', ')} (received "${value}")`);
  }
  return value as StorageKind;
}

/** All runtime settings in one place, read once from environment variables. */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  storage: readStorageKind(),

  // Local files
  xmlFile: process.env.XML_FILE ?? 'data/db.xml',
  jsonFile: process.env.JSON_FILE ?? 'data/db.json',

  // MongoDB
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017',
  mongoDb: process.env.MONGO_DB ?? 'user_portal',

  // AWS DynamoDB. Credentials come from the standard AWS places
  // (environment variables, ~/.aws/credentials, or an IAM role).
  awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
  dynamoEndpoint: process.env.DYNAMO_ENDPOINT || undefined, // set only for a local emulator
  dynamoTablePrefix: process.env.DYNAMO_TABLE_PREFIX ?? 'waypoint',

  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-real-deployments',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
  maxDelayMs: Number(process.env.MAX_DELAY_MS ?? 10_000),
} as const;
