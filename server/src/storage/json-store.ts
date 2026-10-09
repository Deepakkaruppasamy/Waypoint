import { FileDatabase, FileStore } from './file-store';

/** Keeps everything in one JSON file. */
export class JsonStore extends FileStore {
  readonly kind = 'Local JSON file';

  protected parse(text: string): FileDatabase {
    const parsed = JSON.parse(text) as Partial<FileDatabase>;
    return { users: parsed.users ?? [], records: parsed.records ?? [] };
  }

  protected serialize(db: FileDatabase): string {
    return JSON.stringify(db, null, 2);
  }
}
