import { NextResponse, NextRequest } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { authMiddleware } from "@/libs/middleware";

// Initialize Firebase Admin SDK
const firebaseConfig = {
  credential: cert({
    projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
    clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fixing the newline issue
  }),
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);

  if (authResult instanceof NextResponse) {
    return authResult;  // If authMiddleware returned a response, return it (e.g., an error response)
  }

  req.user = authResult;
  const authUserID = req.user.user_id;
  
  const body = await req.json();

  if (!authUserID) {
    return NextResponse.json({ error: "Login is required" }, { status: 400 });
  }

  try {
    // Retrieve user document using authUserID as the document ID
    const userDoc = await db.collection('users').doc(authUserID).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      return NextResponse.json({ credits: userData.credits });
    } else {
      // If user document does not exist, initialize credits to 0
      const newUserDocRef = db.collection('users').doc(authUserID);
      await newUserDocRef.set({
        credits: 0,
        createdAt: new Date(),
      });

      return NextResponse.json({ credits: 0 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
