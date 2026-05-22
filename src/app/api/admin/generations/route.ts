import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockDb } from '@/lib/mockDb';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const generations = await prisma.generation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        dress: true,
        guestUser: true,
      },
    });
    return NextResponse.json({ success: true, data: generations });
  } catch (error) {
    console.log('⚠️ [Admin Generations API] DB fetch failed. Falling back to MockDB.');
    
    // Construct relationships in-memory
    const mockGenerations = mockDb.generations.map((g) => ({
      ...g,
      dress: mockDb.dresses.find((d) => d.id === g.dressId) || null,
      guestUser: mockDb.guests.find((u) => u.id === g.guestUserId) || null,
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ success: true, data: mockGenerations, isMock: true });
  }
}
