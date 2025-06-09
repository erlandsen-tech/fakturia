import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Server-side user authentication and authorization utilities
 */

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * Get authenticated user on server-side
 * Throws error if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthUser> {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/sign-in');
  }
  
  return {
    id: user.id,
    email: user.email || '',
    role: user.user_metadata?.role
  };
}

/**
 * Verify user owns a specific resource
 */
export async function verifyResourceOwnership(
  tableName: string, 
  resourceId: string, 
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from(tableName)
    .select('user_id')
    .eq('id', resourceId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  return data.user_id === userId;
}

/**
 * Secure data fetcher that automatically filters by user
 */
export async function fetchUserData<T = any>(
  tableName: string,
  selectQuery: string = '*',
  additionalFilters?: Record<string, any>
): Promise<T[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();
  
  let query = supabase
    .from(tableName)
    .select(selectQuery)
    .eq('user_id', user.id);
    
  // Apply additional filters if provided
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }
  
  return (data || []) as T[];
}

/**
 * Secure single record fetcher with ownership verification
 */
export async function fetchUserRecord<T = any>(
  tableName: string,
  recordId: string,
  selectQuery: string = '*'
): Promise<T | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from(tableName)
    .select(selectQuery)
    .eq('id', recordId)
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Record not found or not owned by user
      return null;
    }
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }
  
  return data as T;
}

/**
 * Secure update operation with ownership verification
 */
export async function updateUserRecord(
  tableName: string,
  recordId: string,
  updates: Record<string, any>
): Promise<boolean> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();
  
  // First verify ownership
  const isOwner = await verifyResourceOwnership(tableName, recordId, user.id);
  if (!isOwner) {
    throw new Error('Unauthorized: You do not own this resource');
  }
  
  const { error } = await supabase
    .from(tableName)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId)
    .eq('user_id', user.id); // Double-check ownership in query
  
  if (error) {
    throw new Error(`Failed to update ${tableName}: ${error.message}`);
  }
  
  return true;
}

/**
 * Secure delete operation with ownership verification
 */
export async function deleteUserRecord(
  tableName: string,
  recordId: string
): Promise<boolean> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();
  
  // First verify ownership
  const isOwner = await verifyResourceOwnership(tableName, recordId, user.id);
  if (!isOwner) {
    throw new Error('Unauthorized: You do not own this resource');
  }
  
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id); // Double-check ownership in query
  
  if (error) {
    throw new Error(`Failed to delete ${tableName}: ${error.message}`);
  }
  
  return true;
}

/**
 * Role-based access control
 */
export function requireRole(userRole: string | undefined, requiredRole: string): void {
  if (!userRole || userRole !== requiredRole) {
    throw new Error(`Access denied: ${requiredRole} role required`);
  }
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  return userRole ? allowedRoles.includes(userRole) : false;
} 