"use client";

import { motion } from "framer-motion";
import { Calendar, Sparkles, NotebookPen, Clock, Tags } from "lucide-react";

export function CalendarFeatures() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 blur-3xl" />
          <div className="relative bg-background/60 backdrop-blur-xl rounded-3xl border border-primary/10 p-8 md:p-16">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Smart Calendar</span>
                  </div>
                  <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    Your Schedule & Notes, United
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8">
                    Seamlessly integrate your calendar events with notes, tasks, and reminders in one beautiful interface.
                  </p>
                </motion.div>

                <div className="space-y-6">
                  {[
                    {
                      icon: NotebookPen,
                      title: "Contextual Notes",
                      description: "Attach rich notes directly to calendar events"
                    },
                    {
                      icon: Tags,
                      title: "Smart Tagging",
                      description: "Automatically organize notes by event categories"
                    },
                    {
                      icon: Clock,
                      title: "Time Blocking",
                      description: "Visually plan your day with color-coded time blocks"
                    }
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.2 }}
                      className="flex items-start space-x-4"
                    >
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="relative z-10"
                >
                  <div className="relative bg-background/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 shadow-2xl">
                    <div className="absolute -top-3 -right-3">
                      <motion.div
                        animate={{ rotate: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="w-6 h-6 text-primary" />
                      </motion.div>
                    </div>
                    
                    {/* Calendar UI Mockup */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-4">
                        <div className="font-medium">October 2023</div>
                        <div className="flex space-x-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs">⟨</span>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs">⟩</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, i) => (
                          <div key={i} className="text-muted-foreground p-1">{day}</div>
                        ))}
                        
                        {Array(31).fill(0).map((_, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 + i * 0.02 }}
                            className={`p-1 rounded-full text-center ${
                              i === 14 ? "bg-primary text-primary-foreground" :
                              [6, 11, 20].includes(i) ? "bg-primary/20" : ""
                            }`}
                          >
                            {i + 1}
                          </motion.div>
                        ))}
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 }}
                          className="p-2 rounded-lg bg-primary/10 border-l-2 border-primary"
                        >
                          <div className="text-xs font-medium">9:00 AM - Project Review</div>
                          <div className="text-xs text-muted-foreground truncate">3 notes attached</div>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 }}
                          className="p-2 rounded-lg bg-blue-500/10 border-l-2 border-blue-500"
                        >
                          <div className="text-xs font-medium">2:30 PM - Team Meeting</div>
                          <div className="text-xs text-muted-foreground truncate">Agenda prepared</div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent blur-2xl" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 