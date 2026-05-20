import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ensure the route is configured for dynamic fetching so Vercel doesn't cache it
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Execute a simple select query to keep the Supabase database active
    await prisma.product.findFirst();
    
    return NextResponse.json({ status: 'alive' });
  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
