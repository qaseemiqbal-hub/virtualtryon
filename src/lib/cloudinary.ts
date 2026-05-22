import { v2 as cloudinary } from 'cloudinary';

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads an image (base64 string or image URL) to Cloudinary.
 * Falls back to returning the base64/placeholder in development if Cloudinary is not configured.
 */
export async function uploadImage(fileData: string, folder: string = 'tryon'): Promise<string> {
  if (!isCloudinaryConfigured) {
    console.log('⚠️ [Cloudinary] Not configured. Using simulated cloud storage.');
    
    // If it's a data URI, keep it so that the frontend can render it directly
    if (fileData.startsWith('data:image')) {
      return fileData;
    }
    
    // Return a default beautiful fashion fallback image if plain string is passed
    return fileData || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';
  }

  try {
    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: folder,
      resource_type: 'auto',
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('❌ [Cloudinary] Upload failed:', error);
    throw error;
  }
}
