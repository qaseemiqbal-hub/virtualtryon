import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockDb } from '@/lib/mockDb';
import { isAdminAuthenticated } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const filter = categoryId ? { categoryId } : {};

    const dresses = await prisma.dress.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: dresses });
  } catch (error) {
    console.log('⚠️ [Dresses API] DB fetch failed. Falling back to MockDB.');
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    let mockDresses = await mockDb.getDresses();
    if (categoryId) {
      mockDresses = mockDresses.filter((d) => d.categoryId === categoryId);
    }

    const mockCategories = await mockDb.getCategories();
    const dataWithCategory = mockDresses.map((d) => ({
      ...d,
      category: mockCategories.find((c) => c.id === d.categoryId) || null,
    }));

    return NextResponse.json({ success: true, data: dataWithCategory, isMock: true });
  }
}

export async function POST(request: Request) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, description, image, tags, categoryId } = await request.json();

    if (!title || !image || !categoryId) {
      return NextResponse.json(
        { success: false, message: 'Title, image, and categoryId are required' },
        { status: 400 }
      );
    }

    // Process image: upload base64 or URL to Cloudinary
    let finalImageUrl = image;
    try {
      if (image.startsWith('data:image') || image.startsWith('http')) {
        finalImageUrl = await uploadImage(image, 'dresses');
      }
    } catch (uploadErr) {
      console.error('❌ [Dresses API] Cloudinary upload failed, using original string:', uploadErr);
    }

    const tagsArray = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    try {
      const dress = await prisma.dress.create({
        data: {
          title,
          description: description || null,
          imageUrl: finalImageUrl,
          tags: tagsArray,
          categoryId,
        },
        include: {
          category: true,
        },
      });
      return NextResponse.json({ success: true, data: dress });
    } catch (prismaError) {
      console.log('⚠️ [Dresses API] Prisma insert failed. Inserting into MockDB:', prismaError);

      const dress = await mockDb.addDress({
        title,
        description: description || null,
        imageUrl: finalImageUrl,
        tags: tagsArray,
        categoryId,
      });

      const categories = await mockDb.getCategories();
      const mockCategory = categories.find((c) => c.id === categoryId) || null;

      return NextResponse.json({
        success: true,
        data: {
          ...dress,
          category: mockCategory,
        },
        isMock: true,
      });
    }
  } catch (error) {
    console.error('❌ [Dresses API] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
