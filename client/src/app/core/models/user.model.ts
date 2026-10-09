export const ROLES = ['General User', 'Admin'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  role: Role;
  createdAt: string;
}

export interface Credentials {
  userId: string;
  password: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

/** Fields an admin fills in to create a user. */
export interface NewUser {
  userId: string;
  name: string;
  email: string;
  department: string;
  role: Role;
  password: string;
}

/** Fields an admin can change later. Leave "password" out to keep the current one. */
export type UserChanges = Partial<Omit<NewUser, 'userId'>>;
