// User role types
export type UserRole = 'customer' | 'sales' | 'admin' | 'inventory';

// Role permission helpers
export function canManageProducts(role: UserRole): boolean {
  return role === 'admin' || role === 'sales' || role === 'inventory';
}

export function canManageOrders(role: UserRole): boolean {
  return role === 'admin' || role === 'sales';
}

export function canViewAnalytics(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageCoupons(role: UserRole): boolean {
  return role === 'admin';
}

