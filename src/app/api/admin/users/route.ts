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
    const users = await prisma.guestUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            generations: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.log('⚠️ [Admin Users API] DB fetch failed. Falling back to MockDB.');
    const mockUsers = mockDb.guests.map((u) => ({
      ...u,
      _count: {
        generations: mockDb.generations.filter((g) => g.guestUserId === u.id).length,
      },
    }));
    return NextResponse.json({ success: true, data: mockUsers, isMock: true });
  }
}
