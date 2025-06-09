'use client';

import { useEffect, useState } from 'react';

export default function DatabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<any>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/test-db');
        const result = await response.json();
        
        if (response.ok) {
          setConnectionStatus('connected');
          setDbInfo(result);
        } else {
          throw new Error(result.error || 'Database connection failed');
        }
      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">PostgreSQL Database Test</h3>
      
      {connectionStatus === 'testing' && (
        <div className="text-blue-600">Testing database connection...</div>
      )}
      
      {connectionStatus === 'connected' && (
        <div className="text-green-600">
          ✅ Connected to PostgreSQL successfully!
          {dbInfo && (
            <div className="mt-2 text-sm text-gray-600">
              <div>Version: {dbInfo.version}</div>
              <div>Current Time: {dbInfo.current_time}</div>
            </div>
          )}
        </div>
      )}
      
      {connectionStatus === 'error' && (
        <div className="text-red-600">
          ❌ Connection failed: {error}
          <div className="text-sm mt-2 text-gray-600">
            Make sure your DATABASE_URL environment variable is set correctly.
          </div>
        </div>
      )}
    </div>
  );
} 