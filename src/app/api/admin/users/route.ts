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

export async function PUT(request: Request) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, isBlocked } = await request.json();

    if (!userId || typeof isBlocked !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'userId and isBlocked (boolean) are required' },
        { status: 400 }
      );
    }

    try {
      const updatedUser = await prisma.guestUser.update({
        where: { id: userId },
        data: { isBlocked },
      });
      return NextResponse.json({ success: true, data: updatedUser });
    } catch (dbErr) {
      console.log('⚠️ [Admin User PUT API] DB update failed. Updating MockDB:', dbErr);
      const mockUpdated = await mockDb.toggleGuestBlockStatus(userId, isBlocked);
      if (!mockUpdated) {
        return NextResponse.json({ success: false, message: 'User not found in MockDB' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: mockUpdated, isMock: true });
    }
  } catch (err: any) {
    console.error('❌ [Admin User PUT API] Error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
