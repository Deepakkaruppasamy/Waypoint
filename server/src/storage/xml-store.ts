import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { PortalRecord, StoredUser } from '../models';
import { FileDatabase, FileStore } from './file-store';

/**
 * Keeps everything in one XML file:
 *
 *   <database>
 *     <users>
 *       <user><id>...</id><userId>deepak</userId>...</user>
 *     </users>
 *     <records>
 *       <record><id>REC-1001</id>...</record>
 *     </records>
 *   </database>
 */
export class XmlStore extends FileStore {
  readonly kind = 'Local XML file';

  private readonly parser = new XMLParser({
    // Keep every value as text. Otherwise an id like "0042" would be read as the number 42.
    parseTagValue: false,
    // A list with one entry must still come back as a list.
    isArray: (_tagName, path) => path === 'database.users.user' || path === 'database.records.record',
  });

  private readonly builder = new XMLBuilder({ format: true, indentBy: '  ' });

  protected parse(text: string): FileDatabase {
    const root = this.parser.parse(text)?.database ?? {};
    return {
      users: (root.users?.user ?? []) as StoredUser[],
      records: (root.records?.record ?? []) as PortalRecord[],
    };
  }

  protected serialize(db: FileDatabase): string {
    const body = this.builder.build({
      database: {
        users: { user: db.users },
        records: { record: db.records },
      },
    }) as string;
    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
  }
}
