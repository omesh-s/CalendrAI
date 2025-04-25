# Calendr App

A modern pastel-themed calendar app built with **Next.js** and **Tailwind CSS**.

## 🚀 Quick Start

### Requirements

- Node.js 18+
- npm or yarn
- Git

### Setup

1. **Clone the repo and switch to the `dev` branch**:

   ```bash
   git clone https://github.com/omesh-s/CalendrAI.git
   cd CalendrAI
   git checkout dev
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables** (see below).

4. **Run the development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Environment Variables

Create a `.env.local` in the project root:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key

# Google Auth
GOOGLE_ID=your_google_client_id
GOOGLE_SECRET=your_google_client_secret

# Firebase
NEXT_FIREBASE_API_KEY=your_firebase_api_key
NEXT_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_FIREBASE_APP_ID=your_firebase_app_id
NEXT_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# Firebase Admin
AUTH_FIREBASE_PROJECT_ID=your_firebase_project_id
AUTH_FIREBASE_CLIENT_EMAIL=your_firebase_client_email
AUTH_FIREBASE_PRIVATE_KEY="your_firebase_private_key"
```

### Where to get these:

- **NextAuth**: Use any random secure string for `NEXTAUTH_SECRET`.
- **OpenAI API Key**: [Get it here](https://platform.openai.com/account/api-keys).
- **Google Auth**:
  - Create OAuth credentials [in Google Cloud Console](https://console.cloud.google.com/).
  - Add `http://localhost:3000` to Authorized Redirect URIs.
- **Firebase Config**:
  - Set up a project at [Firebase Console](https://console.firebase.google.com/).
  - Use the web app config and service account keys.

---

## 🛠️ Project Structure

- `/app` — Next.js app router pages and layouts
- `/components` — Reusable UI components
- `/hooks` — Custom React hooks
- `/lib` — Utility libraries and config
- `/public` — Static assets
- `/types` — TypeScript types
- `/utils` — Helper functions

---

## 📢 Notes

- Default dev URL: `http://localhost:3000`
- Make sure you are on the `dev` branch during development.
