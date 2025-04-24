"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { GemIcon } from 'lucide-react';
import { db } from '@/libs/firebase';
import { doc, onSnapshot } from "firebase/firestore";

// Your web app's Firebase configuration (move to a separate file or keep here)
const firebaseConfig = {
  apiKey: process.env.NEXT_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_FIREBASE_APP_ID,
};

interface CreditsButtonProps {
  loc?: string;
}

export default function CreditsButton({ loc = "fixed right-4 bottom-4" }: CreditsButtonProps) {
  const router = useRouter();
  const [credits, setCredits] = useState(0);
  const { data: session } = useSession();

  const handleRedirect = () => {
    router.push('/'); // Replace with your actual billing page route
  };

  useEffect(() => {
    let unsubscribe: any;
    if (session?.user?.id) {
      const userRef = doc(db, 'users', session.user.id);

      unsubscribe = onSnapshot(userRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setCredits(docSnapshot.data().credits);
        }
      }, (error) => {
        console.error("Error fetching user credits: ", error);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session?.user?.id]);

  return (
    <div className={`${loc} z-50`}>
   <Button onClick={handleRedirect} className='py-1 dark:bg-rose-900 dark:bg-rose-900 dark:text-rose-50 dark:text-rose-50 dark:hover:bg-rose-900/90 dark:bg-rose-200 dark:text-rose-900 dark:hover:bg-rose-50/90
      berry:background-primary berry:text-primary-foreground berry:hover:bg-primary/90 text-sm
     '>        <GemIcon className="mr-2 h-4 w-4  " /> {credits}
      </Button>
    </div>
  );
}
