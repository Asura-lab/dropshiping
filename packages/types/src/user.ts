export type UserRole = "customer" | "driver" | "admin";

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label?: string;
  duureg: string;
  khoroo: string;
  gudamj?: string;
  bair?: string;
  toot?: string;
  note?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressInput {
  label?: string;
  duureg: string;
  khoroo: string;
  gudamj?: string;
  bair?: string;
  toot?: string;
  note?: string;
  is_default?: boolean;
}
