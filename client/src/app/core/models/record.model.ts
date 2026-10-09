import { Role } from './user.model';

export type AccessLevel = 'General' | 'Admin';
export type RecordStatus = 'Open' | 'In Review' | 'Approved' | 'Closed';

export interface PortalRecord {
  id: string;
  title: string;
  category: string;
  ownerId: string;
  accessLevel: AccessLevel;
  status: RecordStatus;
  updatedAt: string;
}

/** The API explains what the caller was allowed to see alongside the records. */
export interface RecordAccess {
  role: Role;
  scope: 'own' | 'all';
  visibleCount: number;
  totalCount: number;
}

export interface RecordsResponse {
  items: PortalRecord[];
  access: RecordAccess;
}
