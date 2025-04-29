"use client";

import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      
      <div className="container px-4 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-xl p-8 md:p-16 rounded-3xl border border-primary/10 text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Start Organizing Your Time Today
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who have transformed their productivity with Calendr's
            seamless calendar and note-taking experience.
          </p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link href="/dashboard">
              <button className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground
                             hover:bg-primary/90 transition-colors duration-300 shadow-xl shadow-primary/20">
                <span className="font-medium">Get Started for Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </Link>
            
            <Link href="/pricing">
              <button className="px-8 py-4 rounded-full bg-background/50 border border-primary/20 text-foreground
                             hover:bg-primary/5 transition-colors duration-300">
                <span className="font-medium">View Pricing</span>
              </button>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-sm text-muted-foreground"
          >
            No credit card required • Free 14-day trial • Cancel anytime
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
