import { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Viewport } from "next";
import PlausibleProvider from "next-plausible";
import ClientLayout from "@/components/LayoutClient";
import config from "@/config";
import "./globals.css";
import FirebaseAuthProvider from "@/libs/FirebaseAuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
const font = Inter({ subsets: ["latin"] });
// import { Analytics } from "@vercel/analytics/react"
import { NotesProvider } from "@/components/context/NotesProvider";
export const viewport: Viewport = {
  // Will use the primary color of your theme to show a nice theme color in the URL bar of supported browsers
  themeColor: config.colors.main,
  width: "device-width",
  maximumScale: 1,
  initialScale: 1,
};

// This adds default SEO tags to all pages in our app.
// You can override them in each page passing params to getSOTags() function.

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"  >
      {config.domainName && (
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></meta>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
         <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100..900;1,100..900&family=Zilla+Slab:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
        
          <PlausibleProvider domain={config.domainName} />
        </head>
      )}
      <body>
        
      <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            themes={['light','dark','zinc','berry','violet','rose']}
            disableTransitionOnChange
          >
                
        {/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
        <ClientLayout>

            <NotesProvider>
            {children} 
            </NotesProvider>

          </ClientLayout>
       
     </ThemeProvider>
     {/* <Analytics /> */}

      </body>
    </html>
  );
}
