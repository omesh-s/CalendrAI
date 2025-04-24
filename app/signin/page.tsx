"use client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, Suspense } from "react";
import apiClient from "@/libs/api";

const Signin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const callback = searchParams.get("callback") || "weave";

  const redirect = (callback: string) => {
    console.log("CALLBACK ", callback);
    router.push(callback);

  };


  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Signup or Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <div className="grid gap-4">
            {session ? (
              <>
                <Button onClick={() => signOut()} variant="outline" className="w-full">
                  Redirecting . . .
                </Button>
                {redirect(callback)}
              </>
            ) : (
              <>
                <Button onClick={() => signIn("google")} variant="outline" className="w-full">
                  Login with Google
                </Button>
              </>
            )}
          </div>
          <div className="mt-4 text-center text-sm">
            {/* You can add a sign-up link here if needed */}
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="/signin2.png"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.8]"
        />
      </div>
    </div>
  );
};

const SigninPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <Signin />
  </Suspense>
);

export default SigninPage;
