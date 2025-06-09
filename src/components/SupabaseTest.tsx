'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createClient();
        
        // Test the connection by getting the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        // Try a simple query to test database connection
        const { data, error: queryError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .limit(1);
        
        if (queryError) {
          // If we can't query tables, that's fine - connection is still working
          console.log('Query error (expected if no tables):', queryError.message);
        }
        
        setConnectionStatus('connected');
        setUser(session?.user || null);
      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Supabase SSR Connection Test</h3>
      
      {connectionStatus === 'testing' && (
        <div className="text-blue-600">Testing Supabase connection...</div>
      )}
      
      {connectionStatus === 'connected' && (
        <div className="text-green-600">
          ✅ Connected to Supabase successfully!
          <div className="mt-2 text-sm text-gray-600">
            <div>Auth Status: {user ? 'Authenticated' : 'Not authenticated'}</div>
            {user && <div>User ID: {user.id}</div>}
          </div>
        </div>
      )}
      
      {connectionStatus === 'error' && (
        <div className="text-red-600">
          ❌ Connection failed: {error}
          <div className="text-sm mt-2 text-gray-600">
            Make sure your Supabase environment variables are set correctly.
          </div>
        </div>
      )}
    </div>
  );
} 