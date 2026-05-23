import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockDb } from '@/lib/mockDb';
import { uploadImage } from '@/lib/cloudinary';
import { triggerTryOn } from '@/lib/replicate';

export async function POST(request: Request) {
  try {
    const { guestToken, humanImage, dressId, optionalName, simulate } = await request.json();

    if (!guestToken || !humanImage || !dressId) {
      return NextResponse.json(
        { success: false, message: 'guestToken, humanImage, and dressId are required' },
        { status: 400 }
      );
    }

    // 0. Extract Client IP Address
    const ip = request.headers.get('x-real-ip') || 
               request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               '127.0.0.1';

    // 0.1 Check if IP or Guest Token is blocked
    let isBlocked = false;
    try {
      const blockedRecord = await prisma.guestUser.findFirst({
        where: {
          OR: [
            { guestToken: guestToken, isBlocked: true },
            { ipAddress: ip, isBlocked: true }
          ]
        }
      });
      if (blockedRecord) {
        isBlocked = true;
      }
    } catch (e) {
      const mockBlockedRecord = mockDb.guests.find(
        g => (g.guestToken === guestToken && g.isBlocked === true) || 
             (g.ipAddress === ip && g.isBlocked === true)
      );
      if (mockBlockedRecord) {
        isBlocked = true;
      }
    }

    if (isBlocked) {
      return NextResponse.json(
        { success: false, message: 'Your access to virtual try-on has been restricted by the administrator.' },
        { status: 403 }
      );
    }

    // 1. Upload human image to Cloudinary (or fallback base64 in development)
    let uploadedHumanUrl;
    try {
      uploadedHumanUrl = await uploadImage(humanImage, 'customers');
    } catch (err) {
      console.error('❌ [Try-On API] Cloudinary human image upload failed, using source payload:', err);
      uploadedHumanUrl = humanImage;
    }

    // 2. Fetch dress info
    let dressTitle = 'Dress';
    let dressImageUrl = '';

    try {
      const dress = await prisma.dress.findUnique({
        where: { id: dressId },
      });
      if (dress) {
        dressTitle = dress.title;
        dressImageUrl = dress.imageUrl;
      } else {
        throw new Error('Dress not found in Postgres');
      }
    } catch (dbErr) {
      console.log('⚠️ [Try-On API] DB dress fetch failed, looking in MockDB.');
      const mockDresses = await mockDb.getDresses();
      const mockDress = mockDresses.find((d) => d.id === dressId);
      if (mockDress) {
        dressTitle = mockDress.title;
        dressImageUrl = mockDress.imageUrl;
      } else {
        return NextResponse.json(
          { success: false, message: 'Selected dress not found' },
          { status: 404 }
        );
      }
    }

    // 3. Trigger Replicate AI prediction (runs synchronously or mock)
    let triggerResult;
    try {
      if (simulate === true) {
        console.log('⚡ [Try-On API] Simulate flag is active. Bypassing Replicate.');
        const mockId = `mock_${Math.random().toString(36).substring(2, 11)}`;
        triggerResult = {
          id: mockId,
          status: 'starting',
        };
      } else {
        triggerResult = await triggerTryOn({
          customerImageUrl: uploadedHumanUrl,
          dressImageUrl: dressImageUrl,
          dressTitle: dressTitle,
        });
      }
    } catch (repErr) {
      console.error('❌ [Try-On API] Replicate AI trigger failed:', repErr);
      return NextResponse.json(
        { success: false, message: 'Failed to initiate AI try-on generation' },
        { status: 500 }
      );
    }

    // 4. Save to Database (Prisma Postgres or MockDB fallback)
    try {
      // Find or create Guest User
      let guestUser = await prisma.guestUser.findUnique({
        where: { guestToken },
      });

      if (!guestUser) {
        guestUser = await prisma.guestUser.create({
          data: {
            guestToken,
            optionalName: optionalName || null,
            ipAddress: ip,
          },
        });
      } else {
        // Update IP address on existing user if changed or empty
        if (!guestUser.ipAddress || guestUser.ipAddress !== ip) {
          guestUser = await prisma.guestUser.update({
            where: { id: guestUser.id },
            data: { 
              ipAddress: ip,
              optionalName: optionalName || guestUser.optionalName
            },
          });
        } else if (optionalName && guestUser.optionalName !== optionalName) {
          guestUser = await prisma.guestUser.update({
            where: { id: guestUser.id },
            data: { optionalName },
          });
        }
      }

      // Create Generation record
      const generation = await prisma.generation.create({
        data: {
          guestUserId: guestUser.id,
          dressId: dressId,
          originalImageUrl: uploadedHumanUrl,
          replicateId: triggerResult.id,
          status: triggerResult.status.toUpperCase(), // PENDING, PROCESSING
        },
      });

      return NextResponse.json({
        success: true,
        data: generation,
      });
    } catch (prismaErr) {
      console.log('⚠️ [Try-On API] Prisma DB save failed. Saving in MockDB:', prismaErr);

      const guestUser = await mockDb.findOrCreateGuest(guestToken, optionalName, ip);

      const generation = await mockDb.addGeneration({
        guestUserId: guestUser.id,
        dressId: dressId,
        originalImageUrl: uploadedHumanUrl,
        generatedImageUrl: null,
        replicateId: triggerResult.id,
        status: 'PENDING',
        error: null,
      });

      return NextResponse.json({
        success: true,
        data: generation,
        isMock: true,
      });
    }
  } catch (error) {
    console.error('❌ [Try-On API] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
