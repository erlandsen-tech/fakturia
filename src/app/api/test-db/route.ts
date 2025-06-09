import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Test the database connection with a simple query
    const result = await query('SELECT version(), NOW() as current_time');
    
    return NextResponse.json({
      success: true,
      version: result.rows[0].version,
      current_time: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      },
      { status: 500 }
    );
  }
} 