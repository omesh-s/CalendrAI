"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = [
    {
      question: "How does Calendr differ from regular calendar apps?",
      answer: "Calendr combines the power of a traditional calendar with smart note-taking capabilities. Unlike regular calendar apps, Calendr allows you to attach rich notes to events, create context-aware templates, and uses AI to help organize your schedule and information in one unified experience."
    },
    {
      question: "Can Calendr sync with my existing calendar services?",
      answer: "Yes! Calendr seamlessly integrates with popular calendar services like Google Calendar, Microsoft Outlook, and Apple Calendar. This allows you to manage all your existing events while taking advantage of Calendr's advanced note-taking features."
    },
    {
      question: "How does the AI assistant help with my calendar?",
      answer: "Our AI assistant analyzes your calendar patterns and note-taking habits to provide intelligent suggestions. It can automatically create meeting templates, suggest optimal scheduling times, help prepare for upcoming events by gathering relevant notes, and even identify opportunities to block focused work time."
    },
    {
      question: "Is my calendar and note data secure?",
      answer: "Absolutely. We take data security very seriously. All your calendar events and notes are encrypted both in transit and at rest. We never share your data with third parties, and you maintain full ownership and control over all your information."
    },
    {
      question: "Can I collaborate with my team using Calendr?",
      answer: "Yes! Calendr offers powerful collaboration features. You can share specific calendars with team members, collaborate on event notes in real-time, and even create team templates for recurring meetings. This makes Calendr perfect for both personal productivity and team coordination."
    },
    {
      question: "What platforms does Calendr support?",
      answer: "Calendr works seamlessly across all major platforms. We offer web access, native applications for Windows, macOS, iOS, and Android. Your data syncs automatically across all your devices, so you can access your calendar and notes wherever you are."
    }
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      
      <div className="container px-4 mx-auto">
        <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <HelpCircle className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Common Questions</span>
            </div>
          <h2 className="text-4xl font-bold mb-6">
            Frequently Asked{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Questions
            </span>
            </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know about Calendr
            </p>
          </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="mb-4"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 bg-background/60 backdrop-blur-sm rounded-2xl border border-primary/10 text-left hover:border-primary/20 transition-colors duration-300"
              >
                <span className="font-semibold">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-primary transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-2 text-muted-foreground">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}