export const ROLES = ['General User', 'Admin'] as const;
export type Role = (typeof ROLES)[number];

/** A user exactly as it is stored, including the hashed password. */
export interface StoredUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
}

/** A user as it is sent to the browser. The password hash never leaves the server. */
export type PublicUser = Omit<StoredUser, 'passwordHash'>;

export type AccessLevel = 'General' | 'Admin';
export type RecordStatus = 'Open' | 'In Review' | 'Approved' | 'Closed';

export interface PortalRecord {
  id: string;
  title: string;
  category: string;
  /** userId of the person the record belongs to */
  ownerId: string;
  /** "Admin" records are visible to administrators only */
  accessLevel: AccessLevel;
  status: RecordStatus;
  updatedAt: string;
}

export function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
