# AI-Powered Calendar and Task Management App

A modern calendar and task management application built with **Next.js** and **Tailwind CSS**, enhanced with AI capabilities.

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

![Google Auth Image 1](GOOGLEAUTH1.png)

- **Firebase Config**:
  - Set up a project at [Firebase Console](https://console.firebase.google.com/).
  - Use the web app config and service account keys.

![Google Auth Image 2](GOOGLEAUTH2.png)

## Firebase Setup

1. Create a new Firebase project.
2. On the left sidebar, create and enable Firestore and Authentication (2 modules).
3. Keep defaults for Firestore or you can enable test mode which may work better.

![Google Auth Image 3](GOOGLEAUTH3.png)

## Authentication

4. For Authentication, add a new provider and choose Google and enable.
5. When you click on the Google provider and hover over "Safelist client IDs from external projects (optional)," you should see a link to go to the Google console. Refer to image "GOOGLEAUTH1.png" in /public for a better idea.
6. Click on the edit (pencil) icon next to OAuth2 and then copy the GOOGLE CLIENT ID and GOOGLE SECRET and paste them into your .env. "GOOGLEAUTH2.png"
7. On the same page, add "http://localhost:3000" to the Authorized Javascript Origins and add "http://localhost:3000/api/auth/callback/google" to Authorized Redirect URIs. "GOOGLEAUTH3.png"
8. Hit save.

## Firebase Keys

9. Go back to Firebase [Console](https://console.firebase.google.com/u/3/project/[APP_ID/NAME]/overview).
10. Click on "Add App" and choose web app (3rd icon).
11. Give it any name. It will give you the SDK.
12. Copy the individual variables inside the firebaseConfig part of the SDK and put them under their respective sections in the .env file WITHOUT the quotations.

Firebase Admin service account keys

1. Go to [Firebase Service Accounts](https://console.firebase.google.com/u/3/project/[APP_ID/NAME]/settings/serviceaccounts/adminsdk).
2. Generate a new private key.
3. Open in VS Code or any code editor.
4. Copy Project ID and Client Email WITHOUT the quotations.
5. Copy the Private Key WITH the quotations.
6. By now you should have all the variables required.

## EXAMPLE OF A VALID .ENV File

---

    ```bash
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET=214214214214214sdoaodska1242o14i21o421o4214j214o14
    NODE_ENV=production

    NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-1ASDrYZSAI-AO1sSDoaMSOMAFSOSMCOASDKFNSNDAOSOCSODSOSISOISOCNAODSOAS

    GOOGLE_ID=921051201i29421-kfalk1okaslkp1mkasmdksaasdas.apps.googleusercontent.com
    GOOGLE_SECRET=GOAMAS-kasnMeasmfeoasfnoasmeoasokdeaeg

    NEXT_FIREBASE_API_KEY=AIs1mfampask1gj10mfasp121k321
    NEXT_FIREBASE_AUTH_DOMAIN=calendr-ga31b.firebaseapp.com
    NEXT_FIREBASE_PROJECT_ID=calendr-ga31b
    NEXT_FIREBASE_STORAGE_BUCKET=calendr-ga31b.appspot.com
    NEXT_FIREBASE_MESSAGING_SENDER_ID=963783405185
    NEXT_FIREBASE_APP_ID=1:963783405185:web:c5b8852860b4bd9574e780
    NEXT_FIREBASE_MEASUREMENT_ID=G-9T81QXST0Y
    AUTH_FIREBASE_PROJECT_ID=calendr-ga31b
    AUTH_FIREBASE_CLIENT_EMAIL=firebase-adminsdk-g92sk@calendr-12ala.iam.gserviceaccount.com
    AUTH_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEICONDENSEDTHISPARTBECAUSEITWASSOLONGJ\n-----END PRIVATE KEY-----\n"
    ```

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
