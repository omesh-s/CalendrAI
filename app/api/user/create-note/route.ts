import { NextResponse, NextRequest } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { authMiddleware } from "@/libs/middleware";

const firebaseConfig = {
  credential: cert({
    projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
    clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  req.user = authResult;
  const authUserID = req.user.user_id;
  const noteData = await req.json();

  if (!authUserID) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 400 });
  }

  try {
    const noteRef = await db
      .collection('users')
      .doc(authUserID)
      .collection('notes')
      .add({
        ...noteData,
        timestamp: Date.now(),
      });

    const newNote = {
      id: noteRef.id,
      ...noteData,
    };
    
    return NextResponse.json({data:{ note: newNote }});
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 