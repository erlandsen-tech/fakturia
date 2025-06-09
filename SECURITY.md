# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in the Astral application to ensure users can only access data they are authorized to see.

## 🛡️ Security Layers Implemented

### 1. Row Level Security (RLS) at Database Level

**Location:** `supabase/migrations/001_enable_rls_security.sql`

- **Enabled RLS** on all tables (`clients`, `invoices`, `invoice_items`, `payments`)
- **Ownership-based policies** ensure users can only access their own data
- **Cascade protection** for related tables (invoice_items and payments inherit invoice ownership)
- **Automatic user_id assignment** via database triggers
- **Prevention of user_id tampering** through update triggers

### 2. Server-Side Authorization Framework

**Location:** `src/lib/auth.ts`

Provides secure functions for:
- **User authentication verification** (`getAuthenticatedUser`)
- **Resource ownership verification** (`verifyResourceOwnership`)
- **Secure data fetching** with automatic user filtering (`fetchUserData`, `fetchUserRecord`)
- **Protected updates/deletes** with ownership checks (`updateUserRecord`, `deleteUserRecord`)
- **Role-based access control** (`requireRole`, `hasAnyRole`)

### 3. Secure API Routes

**Locations:** 
- `src/app/api/invoices/route.ts`
- `src/app/api/invoices/[id]/route.ts`

Features:
- **Server-side authentication** required for all operations
- **Double ownership verification** (middleware + application level)
- **Field filtering** to prevent unauthorized data modification
- **Proper error handling** with appropriate HTTP status codes

### 4. Enhanced Middleware Protection

**Location:** `middleware.ts`

Protects:
- **Page routes** (redirects to sign-in)
- **API routes** (returns 401 Unauthorized)
- **Comprehensive route matching** for all protected endpoints

### 5. Secure Server Components

**Location:** `src/app/invoices/[id]/page.tsx`

- **Server-side data fetching** with built-in authorization
- **Automatic ownership verification** before rendering
- **Proper error handling** (404 for unauthorized access)
- **Clean separation** of server and client concerns

## 🔐 Security Features

### Data Access Control

```typescript
// ✅ SECURE: Automatic user filtering
const invoices = await fetchUserData<Invoice>('invoices');

// ❌ INSECURE: Manual filtering (vulnerable)
const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id);
```

### Resource Ownership Verification

```typescript
// ✅ SECURE: Ownership verified before access
const invoice = await fetchUserRecord<Invoice>('invoices', invoiceId);

// ❌ INSECURE: Direct access by ID (vulnerable)
const { data } = await supabase.from('invoices').select('*').eq('id', invoiceId);
```

### Protected Updates

```typescript
// ✅ SECURE: Ownership verified before update
await updateUserRecord('invoices', invoiceId, updates);

// ❌ INSECURE: Direct update (vulnerable)
await supabase.from('invoices').update(updates).eq('id', invoiceId);
```

## 🎯 Threat Prevention

### 1. **Insecure Direct Object Reference (IDOR)**
- **Prevention:** All record access requires ownership verification
- **Implementation:** Database RLS + application-level checks

### 2. **Horizontal Privilege Escalation**
- **Prevention:** Users cannot access other users' data
- **Implementation:** Automatic user_id filtering in all queries

### 3. **Data Tampering**
- **Prevention:** user_id fields cannot be modified
- **Implementation:** Database triggers prevent user_id changes

### 4. **Unauthorized API Access**
- **Prevention:** All API routes require authentication
- **Implementation:** Middleware authentication + server-side verification

### 5. **Client-Side Authorization Bypass**
- **Prevention:** All authorization happens server-side
- **Implementation:** Server components + secure API routes

## 🚀 Implementation Checklist

- [x] Enable Row Level Security on all tables
- [x] Create comprehensive RLS policies
- [x] Implement server-side authorization utilities
- [x] Create secure API routes with ownership verification
- [x] Update middleware to protect API endpoints
- [x] Convert vulnerable client components to secure server components
- [x] Add automatic user_id assignment triggers
- [x] Prevent user_id modification via database triggers
- [x] Add performance indexes for security queries

## 📝 Usage Guidelines

### For New Features

1. **Always use authorization utilities** from `src/lib/auth.ts`
2. **Never bypass ownership checks** for "convenience"
3. **Use server components** for data fetching when possible
4. **Implement proper error handling** for authorization failures

### For API Endpoints

```typescript
// Template for secure API routes
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const record = await fetchUserRecord<YourType>('table_name', params.id);
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    // Handle errors appropriately
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### For Data Mutations

```typescript
// Always verify ownership before mutations
try {
  await updateUserRecord('table_name', recordId, updates);
  // Success handling
} catch (error) {
  if (error.message.includes('Unauthorized')) {
    // Handle unauthorized access
  }
  // Handle other errors
}
```

## 🔍 Security Testing

### Manual Testing Scenarios

1. **Test unauthorized access** by manually changing URLs/IDs
2. **Verify API protection** by calling endpoints without authentication
3. **Test ownership boundaries** by attempting to access other users' data
4. **Verify error responses** don't leak sensitive information

### Automated Testing

Consider implementing:
- Integration tests for authorization flows
- Unit tests for authorization utilities
- End-to-end tests for complete user journeys

## 📞 Security Incident Response

If a security vulnerability is discovered:

1. **Immediately assess** the scope and impact
2. **Apply hotfix** if necessary (temporary restrictions)
3. **Implement proper fix** following this security framework
4. **Test thoroughly** before deployment
5. **Document lessons learned** and update security measures

## 🎓 Best Practices Summary

- **Defense in depth:** Multiple security layers (database + application + middleware)
- **Principle of least privilege:** Users only access their own data
- **Secure by default:** Authorization required for all operations
- **Server-side verification:** Never trust client-side authorization
- **Proper error handling:** Don't leak information through error messages
- **Regular audits:** Periodically review and test security measures

## 📚 Related Documentation

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Remember:** Security is not a feature—it's a requirement. Every new addition to the application should be evaluated through the lens of these security principles. 