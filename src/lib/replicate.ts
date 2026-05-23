import { uploadImage } from './cloudinary';

// FASHN.ai API Key configuration
const isFashnConfigured = !!process.env.FASHN_API_KEY;

export interface TryOnInput {
  customerImageUrl: string;
  dressImageUrl: string;
  dressTitle: string;
  category?: 'upper_body' | 'lower_body' | 'dresses';
}

/**
 * Triggers the virtual try-on prediction asynchronously via FASHN.ai Direct API.
 * Returns the prediction/run ID and initial status.
 */
export async function triggerTryOn({
  customerImageUrl,
  dressImageUrl,
  dressTitle,
  category = 'dresses',
}: TryOnInput) {
  if (!isFashnConfigured) {
    console.log('⚠️ [FASHN.ai] API Key not found. Generating simulation job ID.');
    const mockId = `mock_${Math.random().toString(36).substring(2, 11)}`;
    return {
      id: mockId,
      status: 'starting',
    };
  }

  try {
    const fashnCategory = category === 'dresses' 
      ? 'one-pieces' 
      : category === 'lower_body' 
      ? 'bottoms' 
      : category === 'upper_body' 
      ? 'tops' 
      : 'auto';
    
    console.log(`🚀 [FASHN.ai] Launching try-on run for dress: "${dressTitle}"`);
    const res = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FASHN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'tryon-v1.6', // ultra-fast & highly efficient V1.6 model
        inputs: {
          garment_image: dressImageUrl,
          model_image: customerImageUrl,
          category: fashnCategory,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`FASHN.ai API initiation failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (!data.id) {
      throw new Error(`Invalid response from FASHN.ai: ${JSON.stringify(data)}`);
    }

    console.log(`✓ [FASHN.ai] Run initiated successfully. ID: ${data.id}, status: ${data.status}`);
    return {
      id: data.id,
      status: data.status || 'starting',
    };
  } catch (error) {
    console.error('❌ [FASHN.ai] Failed to trigger try-on:', error);
    throw error;
  }
}

/**
 * Checks the status of an ongoing FASHN.ai try-on prediction.
 * Supports simulated predictions (starting with `mock_`) using time-based progression.
 */
export async function getPredictionStatus(predictionId: string, createdAt: Date, dressImageUrl: string) {
  if (predictionId.startsWith('mock_')) {
    const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
    
    if (elapsedSeconds < 2) {
      return { status: 'starting', output: null };
    } else if (elapsedSeconds < 5) {
      return { status: 'processing', output: null };
    } else {
      return { 
        status: 'succeeded', 
        output: dressImageUrl 
      };
    }
  }

  if (!isFashnConfigured) {
    throw new Error('FASHN.ai API Key is not initialized, and this is not a mock prediction.');
  }

  try {
    const res = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.FASHN_API_KEY}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`FASHN.ai status check failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    
    let outputUrl = null;
    const statusLower = (data.status || 'starting').toLowerCase();

    if (statusLower === 'completed' && data.output) {
      // FASHN output is typically a URL string or an array
      outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    }

    // Map FASHN.ai status to our app's internal status representation
    let mappedStatus = 'starting';
    if (statusLower === 'completed') {
      mappedStatus = 'succeeded';
    } else if (statusLower === 'failed') {
      mappedStatus = 'failed';
    } else if (statusLower === 'processing') {
      mappedStatus = 'processing';
    }

    return {
      status: mappedStatus,
      output: outputUrl,
      error: data.error || null,
    };
  } catch (error) {
    console.error(`❌ [FASHN.ai] Failed to retrieve prediction status for ${predictionId}:`, error);
    throw error;
  }
}
