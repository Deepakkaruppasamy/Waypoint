import path from 'node:path';
import { config } from '../config';
import { DataStore } from './data-store';
import { DynamoStore } from './dynamo-store';
import { JsonStore } from './json-store';
import { MongoStore } from './mongo-store';
import { XmlStore } from './xml-store';

export type { DataStore } from './data-store';

/** Picks the storage backend named by the STORAGE environment variable. */
export function createDataStore(): DataStore {
  switch (config.storage) {
    case 'xml':
      return new XmlStore(path.resolve(process.cwd(), config.xmlFile));
    case 'json':
      return new JsonStore(path.resolve(process.cwd(), config.jsonFile));
    case 'mongo':
      return new MongoStore(config.mongoUri, config.mongoDb);
    case 'dynamo':
      return new DynamoStore({
        region: config.awsRegion,
        endpoint: config.dynamoEndpoint,
        tablePrefix: config.dynamoTablePrefix,
      });
  }
}
