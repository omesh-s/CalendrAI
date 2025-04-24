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
const limit = parseInt(searchParams.get('limit') || '50', 10);
const startAfter = searchParams.get('startAfter') ? parseInt(searchParams.get('startAfter')!, 10) : undefined;
console.log("got data ",limit)
console.log("other ",startAfter)
try {
let query = db
.collection('users')
.doc(authUserID)
.collection('notes')
.orderBy('timestamp', 'desc')
.limit(limit);
if (startAfter !== undefined) {
query = query.startAfter(startAfter);
}
const notesSnapshot = await query.get();
const notes = notesSnapshot.docs.map(doc => ({
id: doc.id,
...doc.data()
}));
console.log("DATa ",notes.length)
return NextResponse.json({ data: { notes } });
} catch (error: any) {
console.error('Error fetching notes:', error);
return NextResponse.json({ error: error.message }, { status: 500 });
}
}