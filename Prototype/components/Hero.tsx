"use client";

import { motion } from "framer-motion";
import { Calendar, NotebookPen, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-primary/5 rounded-full"
            style={{
              width: `${Math.random() * 400 + 100}px`,
              height: `${Math.random() * 400 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="container relative z-10 px-4">
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/50 blur-2xl" />
            <div className="relative bg-background/90 backdrop-blur-xl px-8 py-4 rounded-2xl border border-primary/10">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground transition duration-300 hover:text-primary">
                  Smart Calendar + Notes
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-8 text-center"
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
              <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/70 to-primary pb-4">
                Calendr
              </span>{" "}
              <br />
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="inline-block text-foreground text-3xl md:text-5xl"
              >
                Where Time Meets Ideas
              </motion.span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-6 text-xl text-muted-foreground max-w-2xl text-center leading-relaxed"
          >
            Seamlessly blend your calendar with intelligent note-taking. 
            Schedule, create, and organize all in one beautiful workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <Link href="/dashboard">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium 
                             hover:bg-primary/90 transition-colors duration-300 shadow-lg shadow-primary/20">
                Get Started
              </button>
            </Link>
            <Link href="/demo">
              <button className="px-8 py-3 bg-background border border-primary/20 text-foreground rounded-full font-medium 
                             hover:bg-primary/5 transition-colors duration-300">
                Watch Demo
              </button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}