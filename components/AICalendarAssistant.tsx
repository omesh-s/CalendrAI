"use client";

import { motion } from "framer-motion";
import { Bot, Calendar, Brain, MessageSquareMore, LightbulbIcon } from "lucide-react";

export function AICalendarAssistant() {
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
              <div className="order-2 md:order-1 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="relative z-10"
                >
                  <div className="relative bg-background/80 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 shadow-2xl">
                    {/* AI Assistant Chat Interface */}
                    <div className="space-y-4">
                      <div className="flex items-center mb-2">
                        <Bot className="w-6 h-6 text-primary mr-2" />
                        <span className="font-medium">Calendr Assistant</span>
                      </div>
                      
                      <div className="space-y-3">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 }}
                          className="ml-auto max-w-[75%] p-3 rounded-2xl rounded-tr-sm bg-primary/5 text-sm"
                        >
                          I need to prepare for tomorrow's meeting
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7 }}
                          className="max-w-[75%] p-3 rounded-2xl rounded-tl-sm bg-primary/20 text-sm"
                        >
                          I see you have a "Quarterly Review" at 10:00 AM tomorrow. Would you like me to:
                          <ul className="mt-2 space-y-1">
                            <li className="flex items-center"><LightbulbIcon className="w-3 h-3 mr-1" /> Create a notes template?</li>
                            <li className="flex items-center"><LightbulbIcon className="w-3 h-3 mr-1" /> Gather previous meeting notes?</li>
                            <li className="flex items-center"><LightbulbIcon className="w-3 h-3 mr-1" /> Block 30 minutes of prep time?</li>
                          </ul>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.9 }}
                          className="flex items-center gap-2 mt-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <div className="w-2 h-2 rounded-full bg-primary/70 animate-pulse delay-150" />
                          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse delay-300" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent blur-2xl" />
              </div>
              
              <div className="order-1 md:order-2">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
                    <Brain className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">AI Calendar Assistant</span>
                  </div>
                  <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    Your Intelligent Calendar Companion
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8">
                    Let our AI assistant help you manage your schedule, prepare for meetings, and organize your notes automatically.
                  </p>
                </motion.div>

                <div className="space-y-6">
                  {[
                    {
                      icon: Calendar,
                      title: "Smart Scheduling",
                      description: "AI suggests optimal meeting times based on your habits and availability"
                    },
                    {
                      icon: MessageSquareMore,
                      title: "Meeting Preparation",
                      description: "Automatically gathers relevant notes and creates templates before events"
                    },
                    {
                      icon: Brain,
                      title: "Contextual Insights",
                      description: "Provides intelligent suggestions based on your calendar and notes"
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
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 