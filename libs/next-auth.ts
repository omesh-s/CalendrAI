import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import config from "@/config";
import { FirestoreAdapter } from "@auth/firebase-adapter"
import { cert } from "firebase-admin/app"
import * as admin from 'firebase-admin'
import { db } from "./firebaseAdmin";


interface NextAuthOptionsExtended extends NextAuthOptions {
  adapter: any;
}

export const authOptions: NextAuthOptionsExtended = {
  // Set any random key in .env.local
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.given_name ? profile.given_name : profile.name,
          email: profile.email,
          image: profile.picture,
          createdAt: new Date(),
        };
      },
    }),
  ],

  
  adapter: FirestoreAdapter({
    credential: cert({
      projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
      clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY,
    }),
  }),


  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user) {
        const email = session.user.email;

        if (email) {
          const userSnapshot = await db.collection('users').where('email', '==', email).get();
  
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            // Set the session credits from the db if it exists
            if (userData.credits !== undefined) {
              session.user.credits = userData.credits;
            } else {
              // Set everything to 0
              await userDoc.ref.update({ credits: 5500 });
              session.user.credits = 5500;
            }
            // Set the session priceId from the db if it exists, otherwise set to "Basic"
            session.user.priceId = userData.priceId ? userData.priceId : "Basic";

          } else {
            const newUserDoc = db.collection('users').doc();
            await newUserDoc.set({
              email,
              credits: 5500,
              createdAt: new Date(),
              hasAccess: true,
              priceId: "Basic",
              plan: "Basic",
              dailyGoal: 5,
              chats: []
            });
            session.user.credits = 5500;
            session.user.priceId = "Basic";
          }
  
          session.user.id = token.sub;
          const firebaseToken = await admin.auth().createCustomToken(token.sub);
          session.firebaseToken = firebaseToken;
          session.idToken = "none";
        }
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  
  session: {
    strategy: "jwt",
  },
  theme: {
    brandColor: config.colors.main,
   
  },
};

export default NextAuth(authOptions);
