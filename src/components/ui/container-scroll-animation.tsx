"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion, type MotionValue } from "framer-motion";

/** Compact CryptoZen-skinned scroll card — used on /customize preview, not a marketing dump. */
export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.92, 1] : [1.04, 1]);
  const rotate = useTransform(scrollYProgress, [0, 0.55], [12, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.55], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 0.55], [40, 0]);

  return (
    <div className="relative flex items-center justify-center py-10 md:py-16" ref={containerRef}>
      <div className="relative w-full" style={{ perspective: "1000px" }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: React.ReactNode;
}) => (
  <motion.div style={{ translateY: translate }} className="mx-auto mb-6 max-w-3xl text-center">
    {titleComponent}
  </motion.div>
);

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div
    style={{ rotateX: rotate, scale }}
    className="mx-auto w-full max-w-4xl overflow-hidden rounded-[1.1rem] border border-border bg-[var(--card)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-3"
  >
    <div className="h-full min-h-[220px] w-full overflow-hidden rounded-xl bg-muted/40 md:min-h-[280px]">
      {children}
    </div>
  </motion.div>
);
