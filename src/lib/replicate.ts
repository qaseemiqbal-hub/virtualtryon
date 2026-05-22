import Replicate from 'replicate';

const isReplicateConfigured = !!process.env.REPLICATE_API_TOKEN;

export const replicateClient = isReplicateConfigured
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null;

// Replicate IDM-VTON model version hash
export const IDM_VTON_VERSION = "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985";

export interface TryOnInput {
  customerImageUrl: string;
  dressImageUrl: string;
  dressTitle: string;
  category?: 'upper_body' | 'lower_body' | 'dresses';
}

/**
 * Triggers the virtual try-on prediction asynchronously.
 * Returns prediction ID and initial status.
 */
export async function triggerTryOn({
  customerImageUrl,
  dressImageUrl,
  dressTitle,
  category = 'dresses',
}: TryOnInput) {
  if (!replicateClient) {
    console.log('⚠️ [Replicate] Token not found. Generating simulation job ID.');
    const mockId = `mock_${Math.random().toString(36).substring(2, 11)}`;
    return {
      id: mockId,
      status: 'starting',
    };
  }

  try {
    const prediction = await replicateClient.predictions.create({
      version: IDM_VTON_VERSION,
      input: {
        crop: true,
        category: category,
        human_img: customerImageUrl,
        garm_img: dressImageUrl,
        garment_des: `Generate a realistic virtual fashion try-on image of this ${dressTitle}. Preserve facial identity, hairstyle, body proportions, and skin tone while naturally fitting the garment with realistic lighting, shadows, folds, and fabric texture.`,
      },
    });

    return {
      id: prediction.id,
      status: prediction.status,
    };
  } catch (error) {
    console.error('❌ [Replicate] Failed to trigger try-on:', error);
    throw error;
  }
}

/**
 * Checks the status of an ongoing try-on prediction.
 * For simulated predictions (starting with `mock_`), it uses time-based progression.
 */
export async function getPredictionStatus(predictionId: string, createdAt: Date, dressImageUrl: string) {
  if (predictionId.startsWith('mock_')) {
    const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
    
    if (elapsedSeconds < 2) {
      return { status: 'starting', output: null };
    } else if (elapsedSeconds < 5) {
      return { status: 'processing', output: null };
    } else {
      // Return a simulated high-quality try-on image!
      // In a real mock, we can return the dress image directly, or a gorgeous look,
      // or we can use a premium composited placeholder to make it look super realistic
      // Let's use the dress image as a realistic try-on rendering representation
      return { 
        status: 'succeeded', 
        output: dressImageUrl 
      };
    }
  }

  if (!replicateClient) {
    throw new Error('Replicate client is not initialized, and this is not a mock prediction.');
  }

  try {
    const prediction = await replicateClient.predictions.get(predictionId);
    
    let outputUrl = null;
    if (prediction.status === 'succeeded' && prediction.output) {
      // Replicate outputs are typically arrays or single strings of URLs
      outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    }

    return {
      status: prediction.status, // 'starting', 'processing', 'succeeded', 'failed', 'canceled'
      output: outputUrl,
      error: prediction.error,
    };
  } catch (error) {
    console.error(`❌ [Replicate] Failed to retrieve prediction ${predictionId}:`, error);
    throw error;
  }
}
