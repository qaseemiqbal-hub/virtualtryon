import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockDb } from '@/lib/mockDb';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.log('⚠️ [Categories API] DB fetch failed. Falling back to MockDB.');
    const mockCategories = await mockDb.getCategories();
    return NextResponse.json({ success: true, data: mockCategories, isMock: true });
  }
}

export async function POST(request: Request) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, thumbnailUrl } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      const category = await prisma.category.create({
        data: {
          name,
          slug,
          thumbnailUrl: thumbnailUrl || null,
        },
      });
      return NextResponse.json({ success: true, data: category });
    } catch (prismaError) {
      console.log('⚠️ [Categories API] Prisma insert failed. Inserting into MockDB:', prismaError);
      const category = await mockDb.addCategory({
        name,
        slug,
        thumbnailUrl: thumbnailUrl || null,
      });
      return NextResponse.json({ success: true, data: category, isMock: true });
    }
  } catch (error) {
    console.error('❌ [Categories API] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
