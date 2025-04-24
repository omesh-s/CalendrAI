import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './middleware';
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export async function openaiMiddleware(req: NextRequest) {
  const authResult = await authMiddleware(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const userId = authResult.user_id;
  
  // Check user credits
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData?.credits || userData.credits < 10) {
    return NextResponse.json(
      { error: 'Insufficient credits' },
      { status: 402 }
    );
  }

  return { userId, currentCredits: userData.credits };
}

// Helper function to deduct credits and log usage
export async function deductCredits(userId: string, tokensUsed: number) {
  const creditsToDeduct = Math.max(1, Math.ceil(tokensUsed / 1000)); // 1 credit per 1000 tokens, minimum 1 credit
  
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData?.credits) {
    throw new Error('No credits found for user');
  }

  // Update credits
  await db.collection('users').doc(userId).update({
    credits: userData.credits - creditsToDeduct
  });

  // Log usage
  const date = new Date().toISOString().split('T')[0];
  const usageDocRef = db.collection('users').doc(userId).collection('usage').doc(date);

  const usageDoc = await usageDocRef.get();
  if (usageDoc.exists) {
    const currentData = usageDoc.data();
    await usageDocRef.update({ 
      tokens: (currentData?.tokens || 0) + tokensUsed,
      credits: (currentData?.credits || 0) + creditsToDeduct
    });
  } else {
    await usageDocRef.set({ 
      tokens: tokensUsed,
      credits: creditsToDeduct
    });
  }

  return creditsToDeduct;
} 