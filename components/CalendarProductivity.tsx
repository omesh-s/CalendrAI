"use client";

import { motion } from "framer-motion";
import { Timer, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import Link from 'next/link';

export function CalendarProductivity() {
  const stats = [
    { label: "Meetings Better Prepared", value: "90%", icon: Calendar },
    { label: "Less Time Scheduling", value: "75%", icon: Timer },
    { label: "Increased Focus Time", value: "60%", icon: TrendingUp },
  ];

  return (
    <section className="py-32 relative">
      <div className="absolute bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Optimize Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Daily Workflow
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our users report significant improvements in their time management
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl blur-xl 
                             group-hover:blur-2xl transition-all duration-300" />
              <div className="relative bg-background/50 backdrop-blur-sm p-8 rounded-3xl border border-primary/10
                           hover:border-primary/20 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.2 }}
                    className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70"
                  >
                    {stat.value}
                  </motion.div>
                </div>
                <h3 className="text-lg font-semibold">{stat.label}</h3>
                <div className="mt-4 h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: stat.value }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.2, duration: 1 }}
                    className="h-full bg-gradient-to-r from-primary to-primary/70"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Link href="/dashboard">
            <button className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground
                             hover:bg-primary/90 transition-colors duration-300">
              <span>Start Organizing Your Time</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
} 