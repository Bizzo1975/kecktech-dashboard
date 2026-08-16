"use client";

import { motion } from "framer-motion";
import { fadeInUp, transitionNormal } from "@/lib/animations";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInUp}
      transition={transitionNormal}
    >
      {children}
    </motion.div>
  );
}

