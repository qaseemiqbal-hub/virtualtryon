# AURA | AI Virtual Try-On Fashion Studio

Welcome to **AURA**, a premium, state-of-the-art AI fashion virtual try-on application. 

AURA allows users to browse exclusive dress collections, upload their photos as a guest, and see themselves instantly fitted with realistic folds, fabric textures, shading, and contours using AI. The application is completely optimized for **Vercel Serverless Function** hosting.

---

## 🌟 Key Features

* **Guest Try-On Experience**: Zero signup barrier. Persistent guest session tracking via UUID and localStorage.
* **Premium Interactive UI/UX**: Immersive dark theme, responsive sliding drawer panels, crop and upload drag-and-drop triggers, sweeping AI scan animation loaders, confetti celebrations, and a persistent recent try-ons history shelf.
* **Asynchronous Polling Engine**: Built to comply with Vercel's free serverless timeout constraints (10s limit) by launching try-on predictions asynchronously and polling status logs from the client.
* **Administrative Control Dashboard**: A highly secure admin suite protected by signed HttpOnly JWT cookies. Supports analytics, category creation, dress uploading with tags, and a live try-on comparative monitor showing source pictures vs. dress vs. outputs.
* **Zero-Config Sandbox Mode**: Pre-seeded fallback data. If Cloudinary, PostgreSQL, or Replicate API keys are omitted in development, AURA automatically operates via an in-memory database and AI simulation layer, keeping the application 100% testable out of the box!

---

## 🛠️ Tech Stack

* **Framework**: Next.js 15+ (App Router)
* **Styling**: Tailwind CSS
* **Database Mapping**: Prisma (v6) ORM
* **Cloud Storage**: Cloudinary (integrated for secure, scalable image hosting)
* **AI Try-On Model**: Replicate (`cuuupid/idm-vton` - High-fidelity Virtual Try-on)
* **Authentication**: Signed HTTP-only JWTs (Admin-only)

---

## 🚀 Quick Start (Local Setup)

Follow these simple steps to spin up the fashion studio locally:

### 1. Install Dependencies
Run in your workspace directory:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# 1. Database (Neon or Supabase PostgreSQL)
DATABASE_URL="postgresql://username:password@hostname:5432/databasename?sslmode=require"

# 2. Administrative Settings
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="YourSecureAdminPassword123"
JWT_SECRET="aura-fashion-tryon-secret-signing-key-9988"

# 3. Cloudinary Uploads
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# 4. Replicate AI Engine
REPLICATE_API_TOKEN="r8_your_actual_replicate_api_token"
```
*(If you do not have these credentials yet, you can leave them empty! AURA's simulation engine will automatically kick in so you can run the entire app immediately).*

### 3. Initialize Prisma client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Administrative Access

* Secure Login Route: `http://localhost:3000/admin`
* Default Sandbox Credentials:
  * **Username**: `admin`
  * **Password**: `admin123`

---

## ☁️ Vercel Deployment

Deploying AURA to Vercel is seamless:

1. Push this workspace code to your Git provider (GitHub, GitLab, or Bitbucket).
2. Connect your repository on the [Vercel Dashboard](https://vercel.com).
3. Paste the `.env` parameters into Vercel's **Environment Variables** panel during setup.
4. If a live database is attached, push the schema local-sync:
   ```bash
   npx prisma db push
   ```
5. Click **Deploy**!
