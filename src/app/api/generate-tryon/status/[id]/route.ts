import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockDb } from '@/lib/mockDb';
import { getPredictionStatus } from '@/lib/replicate';
import { uploadImage } from '@/lib/cloudinary';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Generation ID is required' }, { status: 400 });
    }

    let generation;
    let isMockMode = false;
    let dressImageUrl = '';

    // 1. Fetch generation record
    try {
      generation = await prisma.generation.findUnique({
        where: { id },
        include: {
          dress: true,
        },
      });
      if (generation) {
        dressImageUrl = generation.dress.imageUrl;
      } else {
        throw new Error('Generation not found in Postgres');
      }
    } catch (dbErr) {
      console.log(`⚠️ [Try-On Status API] Fetch failed for ID: ${id}. Fallback to MockDB.`);
      const mockGen = await mockDb.getGeneration(id);
      if (mockGen) {
        generation = mockGen;
        isMockMode = true;

        const mockDresses = await mockDb.getDresses();
        const dress = mockDresses.find((d) => d.id === mockGen.dressId);
        dressImageUrl = dress ? dress.imageUrl : '';
      } else {
        return NextResponse.json({ success: false, message: 'Generation job not found' }, { status: 404 });
      }
    }

    // 2. If already finished, return immediately
    if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
      return NextResponse.json({ success: true, data: generation });
    }

    // 3. Otherwise, poll Replicate or mock time-based progression
    if (!generation.replicateId) {
      return NextResponse.json({ success: false, message: 'Invalid prediction parameters' }, { status: 400 });
    }

    try {
      const predictionState = await getPredictionStatus(
        generation.replicateId,
        generation.createdAt,
        dressImageUrl
      );

      const statusUpper = predictionState.status.toUpperCase();

      let finalStatus = generation.status;
      let finalOutputUrl = generation.generatedImageUrl;
      let errorMsg = generation.error;

      if (statusUpper === 'SUCCEEDED' || statusUpper === 'COMPLETED') {
        finalStatus = 'COMPLETED';

        // Upload generated image permanently to Cloudinary
        try {
          if (predictionState.output) {
            finalOutputUrl = await uploadImage(predictionState.output, 'generations');
          }
        } catch (uploadErr) {
          console.error('❌ [Try-On Status API] Output upload to Cloudinary failed:', uploadErr);
          finalOutputUrl = predictionState.output;
        }
      } else if (statusUpper === 'FAILED') {
        finalStatus = 'FAILED';
        errorMsg = typeof predictionState.error === 'string' 
          ? predictionState.error 
          : predictionState.error 
          ? JSON.stringify(predictionState.error) 
          : 'AI try-on generation failed';
      } else if (statusUpper === 'PROCESSING') {
        finalStatus = 'PROCESSING';
      }

      // 4. Update the database record if changed
      if (finalStatus !== generation.status || finalOutputUrl !== generation.generatedImageUrl) {
        if (!isMockMode) {
          generation = await prisma.generation.update({
            where: { id },
            data: {
              status: finalStatus,
              generatedImageUrl: finalOutputUrl,
              error: errorMsg,
            },
            include: {
              dress: true,
            },
          });
        } else {
          generation = await mockDb.updateGeneration(id, {
            status: finalStatus as any,
            generatedImageUrl: finalOutputUrl,
            error: errorMsg,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: generation,
      });
    } catch (repPollErr) {
      console.error('❌ [Try-On Status API] Failed to check prediction status:', repPollErr);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve AI processing state' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [Try-On Status API] GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
