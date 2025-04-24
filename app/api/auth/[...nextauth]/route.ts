import NextAuth,{DefaultSession} from "next-auth";
import { authOptions } from "@/libs/next-auth";
import * as admin from 'firebase-admin'
const handler = NextAuth(authOptions);
import { Session } from 'next-auth';


declare module 'next-auth'{
    interface Session{
       idToken?:string;
       firebaseToken?: string;
       user:{
            id:string;
            priceId:string;
            credits?:number;
       } & DefaultSession["user"]
    } 
}

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      }),
    })
  }

export { handler as GET, handler as POST };
