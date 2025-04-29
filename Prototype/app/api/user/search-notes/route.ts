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

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  req.user = authResult;
  const authUserID = req.user.user_id;

  if (!authUserID) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const queryText = searchParams.get('query') || '';

  try {
    if (!queryText.trim()) {
      return NextResponse.json({ data: { notes: [] } });
    }

    // Firestore does not support full-text search. For more advanced search, consider using Algolia or Firebase's new Search.
    // Here, we'll perform a simple substring match on content and category.

    const notesSnapshot = await db
      .collection('users')
      .doc(authUserID)
      .collection('notes')
      .where('content', '>=', queryText)
      .where('content', '<=', queryText + '\uf8ff')
      .orderBy('content')
      .limit(50)
      .get();

    const notes = notesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ data: { notes } });
  } catch (error: any) {
    console.error('Error searching notes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 