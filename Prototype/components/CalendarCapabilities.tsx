"use client";

import { motion } from "framer-motion";
import { Calendar, NotebookPen, Repeat, Share2, Wifi } from "lucide-react";

export function CalendarCapabilities() {
  const features = [
    {
      icon: Calendar,
      title: "Visual Planning",
      description: "Intuitive drag-and-drop interface for time management",
      gradient: "from-[#FF6B6B] to-[#FFE66D]",
    },
    {
      icon: NotebookPen,
      title: "Smart Notes",
      description: "Attach rich-text notes to any calendar event",
      gradient: "from-[#4ECDC4] to-[#556270]",
    },
    {
      icon: Repeat,
      title: "Recurring Events",
      description: "Set up sophisticated recurring schedules with ease",
      gradient: "from-[#6C63FF] to-[#3B3054]",
    },
    {
      icon: Share2,
      title: "Calendar Sharing",
      description: "Collaborate with team members on shared calendars",
      gradient: "from-[#FF61D2] to-[#FE9090]",
    },
    {
      icon: Wifi,
      title: "Sync Everywhere",
      description: "Access your calendar and notes on all your devices",
      gradient: "from-[#72EDF2] to-[#5151E5]",
    },
  ];

  return (
    <section className="relative py-32">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Powerful{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Calendar Features
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need for effective time and note management
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl blur-xl 
                             group-hover:blur-2xl transition-all duration-300" />
              
              <div className="relative h-full bg-background/50 backdrop-blur-sm p-8 rounded-3xl border border-primary/10
                             hover:border-primary/20 transition-colors duration-300">
                <div className="mb-6">
                  <motion.div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5`}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="w-full h-full bg-background rounded-2xl flex items-center justify-center">
                      <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                  </motion.div>
                </div>

                <h3 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      </div>
    </section>
  );
} 