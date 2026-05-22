import { v4 as uuidv4 } from 'uuid';

export interface MockGuestUser {
  id: string;
  guestToken: string;
  optionalName: string | null;
  createdAt: Date;
}

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  createdAt: Date;
}

export interface MockDress {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  tags: string[];
  categoryId: string;
  createdAt: Date;
}

export interface MockGeneration {
  id: string;
  guestUserId: string;
  dressId: string;
  originalImageUrl: string;
  generatedImageUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  replicateId: string | null;
  error: string | null;
  createdAt: Date;
}

// Global state for mock database to persist during server runtime (dev mode hot reloads)
const globalForMockDb = globalThis as unknown as {
  mockGuests: MockGuestUser[];
  mockCategories: MockCategory[];
  mockDresses: MockDress[];
  mockGenerations: MockGeneration[];
};

if (!globalForMockDb.mockGuests) {
  globalForMockDb.mockGuests = [];
  
  // Seed initial high-quality categories
  const categories: MockCategory[] = [
    {
      id: 'cat-evening',
      name: 'Evening Gowns',
      slug: 'evening-gowns',
      thumbnailUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=600&auto=format&fit=crop',
      createdAt: new Date(),
    },
    {
      id: 'cat-summer',
      name: 'Summer Dresses',
      slug: 'summer-dresses',
      thumbnailUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=600&auto=format&fit=crop',
      createdAt: new Date(),
    },
    {
      id: 'cat-cocktail',
      name: 'Cocktail & Party',
      slug: 'cocktail-party',
      thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop',
      createdAt: new Date(),
    },
    {
      id: 'cat-luxury',
      name: 'Luxury Velvet',
      slug: 'luxury-velvet',
      thumbnailUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e62c82f62?q=80&w=600&auto=format&fit=crop',
      createdAt: new Date(),
    }
  ];
  globalForMockDb.mockCategories = categories;

  // Seed beautiful, premium fashion dresses
  globalForMockDb.mockDresses = [
    {
      id: 'dress-1',
      title: 'Midnight Stellar Gown',
      description: 'A breathtaking emerald-green satin evening gown featuring an open back, high slit, and delicate off-shoulder embroidery. Perfect for premium galas.',
      imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop',
      tags: ['Elegant', 'Emerald', 'Silk', 'Gala'],
      categoryId: 'cat-evening',
      createdAt: new Date(),
    },
    {
      id: 'dress-2',
      title: 'Royal Sapphire Evening Gown',
      description: 'Sleek, body-contouring sapphire evening wear tailored from fine heavy crêpe silk with a pleated bodice and trailing back sash.',
      imageUrl: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?q=80&w=800&auto=format&fit=crop',
      tags: ['Royal Blue', 'Satin', 'Form-fitting'],
      categoryId: 'cat-evening',
      createdAt: new Date(),
    },
    {
      id: 'dress-3',
      title: 'Sun-drenched Linen Sundress',
      description: 'Lightweight off-white linen sundress adorned with hand-stitched floral accents, adjustable straps, and a romantic ruffled hemline.',
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=800&auto=format&fit=crop',
      tags: ['Summer', 'Linen', 'Casual', 'Floral'],
      categoryId: 'cat-summer',
      createdAt: new Date(),
    },
    {
      id: 'dress-4',
      title: 'Solstice Golden Midi',
      description: 'A striking marigold wrap dress made of organic flowing cotton, featuring a self-tie waist and billowy balloon sleeves.',
      imageUrl: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=800&auto=format&fit=crop',
      tags: ['Wrap Dress', 'Yellow', 'Midi', 'Cotton'],
      categoryId: 'cat-summer',
      createdAt: new Date(),
    },
    {
      id: 'dress-5',
      title: 'Rosewood Pleated Cocktail Dress',
      description: 'A lively rosewood pink cocktail dress featuring intricate micro-pleats, a sweetheart neckline, and a structured A-line skirt.',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
      tags: ['Pink', 'Cocktail', 'Pleated', 'Sweetheart'],
      categoryId: 'cat-cocktail',
      createdAt: new Date(),
    },
    {
      id: 'dress-6',
      title: 'Classic Noir Velvet Cocktail',
      description: 'Sophisticated deep black velvet dress cut in a classic sheath silhouette with dramatic puff sleeves and crystal embellishments.',
      imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e62c82f62?q=80&w=800&auto=format&fit=crop',
      tags: ['Black', 'Velvet', 'Luxury', 'Sleeves'],
      categoryId: 'cat-luxury',
      createdAt: new Date(),
    }
  ];

  globalForMockDb.mockGenerations = [];
}

export const mockDb = {
  get guests() { return globalForMockDb.mockGuests; },
  get categories() { return globalForMockDb.mockCategories; },
  get dresses() { return globalForMockDb.mockDresses; },
  get generations() { return globalForMockDb.mockGenerations; },

  // Helper actions
  async findOrCreateGuest(token: string, optionalName?: string | null) {
    let guest = globalForMockDb.mockGuests.find(g => g.guestToken === token);
    if (!guest) {
      guest = {
        id: uuidv4(),
        guestToken: token,
        optionalName: optionalName || null,
        createdAt: new Date()
      };
      globalForMockDb.mockGuests.push(guest);
    } else if (optionalName) {
      guest.optionalName = optionalName;
    }
    return guest;
  },

  async getDresses() {
    return globalForMockDb.mockDresses;
  },

  async getCategories() {
    return globalForMockDb.mockCategories;
  },

  async addDress(dress: Omit<MockDress, 'id' | 'createdAt'>) {
    const newDress: MockDress = {
      ...dress,
      id: `dress_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date()
    };
    globalForMockDb.mockDresses.push(newDress);
    return newDress;
  },

  async addCategory(category: Omit<MockCategory, 'id' | 'createdAt'>) {
    const newCat: MockCategory = {
      ...category,
      id: `cat_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date()
    };
    globalForMockDb.mockCategories.push(newCat);
    return newCat;
  },

  async addGeneration(gen: Omit<MockGeneration, 'id' | 'createdAt'>) {
    const newGen: MockGeneration = {
      ...gen,
      id: `gen_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date()
    };
    globalForMockDb.mockGenerations.push(newGen);
    return newGen;
  },

  async getGeneration(id: string) {
    return globalForMockDb.mockGenerations.find(g => g.id === id) || null;
  },

  async updateGeneration(id: string, updates: Partial<MockGeneration>) {
    const idx = globalForMockDb.mockGenerations.findIndex(g => g.id === id);
    if (idx !== -1) {
      globalForMockDb.mockGenerations[idx] = {
        ...globalForMockDb.mockGenerations[idx],
        ...updates
      } as MockGeneration;
      return globalForMockDb.mockGenerations[idx];
    }
    return null;
  }
};
