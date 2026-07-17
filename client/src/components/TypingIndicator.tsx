import React from "react";
import { motion } from "framer-motion";

export function TypingIndicator() {
  const dotVariants = {
    initial: {
      y: 0,
      opacity: 0.4,
    },
    animate: {
      y: [-4, 4, -4],
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl p-4 shadow-sm self-start max-w-[200px] mt-2 ml-4">
      {/* AI Avatar Indicator */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
        AI
      </div>

      <motion.div
        className="flex items-center gap-1.5"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.span
          className="w-2.5 h-2.5 bg-blue-500 rounded-full"
          variants={dotVariants}
        />
        <motion.span
          className="w-2.5 h-2.5 bg-indigo-500 rounded-full"
          variants={dotVariants}
        />
        <motion.span
          className="w-2.5 h-2.5 bg-purple-500 rounded-full"
          variants={dotVariants}
        />
      </motion.div>
    </div>
  );
}
export default TypingIndicator;
