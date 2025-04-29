
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { auth } from "./firebase";
import { signInWithCustomToken } from "firebase/auth";
import React from "react";
import apiClient from "./api";

async function syncFirebaseAuth(session:Session){
    if(session && session.firebaseToken){
        try{
            const good:any = await signInWithCustomToken(auth,session.firebaseToken)
            const idToken=good["_tokenResponse"]["idToken"]
            await apiClient.post("/store-token", { idToken });
        }
        catch(error){
            console.error("Error signing")
        }
    }
    else{
        auth.signOut()
    }
}


function FirebaseAuthProvider({
    children,
}:{
    children:React.ReactNode;
}){


    const {data: session} = useSession();

  


    useEffect(()=>{
        if(!session) return;
        
        syncFirebaseAuth(session)
    },[session])


    return <>{children}</>
}

export default FirebaseAuthProvider