import { Suspense } from 'react'
import Header from "@/components/Header";
import Hero from "@/components/Hero";

import { FAQ } from '@/components/FAQ';
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

// Import the new calendar-focused components
import { CalendarFeatures } from '@/components/CalendarFeatures';
import { AICalendarAssistant } from '@/components/AICalendarAssistant';
import { CalendarCapabilities } from '@/components/CalendarCapabilities';
import { CalendarProductivity } from '@/components/CalendarProductivity';

export default function Home() {
  return (
    <>
   
      <Suspense>
        <Header /> 
      </Suspense>
      <main className='border-0 '>
     <Hero/>
     <CalendarFeatures/>
     <CalendarCapabilities/>
     <AICalendarAssistant/>
     <CalendarProductivity/>
     
   

        <FAQ />
        <CTA />
        <Footer />

       
      
        
        
      
      </main>
    </>
  );
}
