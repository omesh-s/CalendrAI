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
  const { oldName, newName } = await req.json();

  if (!authUserID) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 400 });
  }

  try {
    const notesRef = db
      .collection('users')
      .doc(authUserID)
      .collection('notes');

    const notesSnapshot = await notesRef
      .where('category', '==', oldName)
      .get();

    // Update all notes with the old category name to the new one
    const batch = db.batch();
    notesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { category: newName });
    });
    await batch.commit();

    return NextResponse.json({data:{ message: "Category updated successfully" }});
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 