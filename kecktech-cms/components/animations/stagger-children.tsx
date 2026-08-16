"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeInUp, transitionNormal } from "@/lib/animations";

interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerChildren({ children, className }: StaggerChildrenProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  index?: number;
}

export function StaggerItem({ children, index = 0 }: StaggerItemProps) {
  return (
    <motion.div
      variants={fadeInUp}
      transition={{ ...transitionNormal, delay: index * 0.1 }}
    >
      {children}
    </motion.div>
  );
}

