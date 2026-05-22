import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'virtual-tryon-super-secret-key-123';

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return false;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return !!decoded;
  } catch (error) {
    return false;
  }
}
