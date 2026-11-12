"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type CharacterProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
  className?: string;
};

/** Per-character assemble-on-scroll — accent-colored for desk branding. */
export function CharacterV1({
  char,
  index,
  centerIndex,
  scrollYProgress,
  className,
}: CharacterProps) {
  const isSpace = char === " ";
  const distanceFromCenter = index - centerIndex;
  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 28, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 28, 0]);

  return (
    <motion.span
      className={cn(
        "inline-block text-[var(--accent)]",
        isSpace && "w-3",
        className,
      )}
      style={{ x, rotateX }}
    >
      {char}
    </motion.span>
  );
}

/** Compact branded title for Layout Studio — not a full-page Lenis marketing section. */
export function AssembleTitle({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.35"],
  });
  const characters = text.split("");
  const centerIndex = Math.floor(characters.length / 2);

  return (
    <h1
      ref={ref}
      aria-label={text}
      className={cn(
        "font-[family-name:var(--font-display)] text-3xl font-semibold uppercase tracking-tighter sm:text-4xl",
        className,
      )}
      style={{ perspective: "500px" }}
    >
      {characters.map((char, index) => (
        <CharacterV1
          key={`${char}-${index}`}
          char={char}
          index={index}
          centerIndex={centerIndex}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </h1>
  );
}
