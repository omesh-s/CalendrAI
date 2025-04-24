// lib/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
      clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error("Invalid ID token");
  }
};

// Extend the NextRequest interface to include user
declare module 'next/server' {
  interface NextRequest {
    user?: admin.auth.DecodedIdToken;
  }
}

export async function authMiddleware(req: NextRequest): Promise<admin.auth.DecodedIdToken | NextResponse> {
  const idToken = req.cookies.get("idToken")?.value;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decodedToken = await verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
