"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { getCategoryThumbnail } from "@/components/category-thumbnails";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/registry/default/ui/card";

type AnimatedCategoryCardProps = {
  slug: string;
  name: string;
  description?: string;
  index: number;
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (index: number) => ({
    opacity: 1,
    transition: {
      delay: index * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
    y: 0,
  }),
};

export function AnimatedCategoryCard({
  slug,
  name,
  description,
  index,
}: AnimatedCategoryCardProps) {
  const href = `/docs/components/${slug}`;
  const thumbnail = getCategoryThumbnail(slug);

  return (
    <motion.div
      animate="visible"
      custom={index}
      initial="hidden"
      variants={cardVariants}
      whileHover="hover"
    >
      <motion.div animate="rest" initial="rest" whileHover="hover">
        <CardFrame className="after:-inset-[5px] after:-z-1 w-full after:pointer-events-none after:absolute after:rounded-[calc(var(--radius-xl)+4px)] after:border after:border-border/64">
          <CardFrameHeader className="grid grid-rows-[auto_1fr]">
            <CardFrameTitle
              className="font-heading text-base"
              render={
                <h2>
                  <Link className="before:absolute before:inset-0" href={href}>
                    {name}
                  </Link>
                </h2>
              }
            />
            <CardFrameDescription
              className="line-clamp-2 sm:h-[2lh]"
              render={<p />}
            >
              {description || "\u00A0"}
            </CardFrameDescription>
          </CardFrameHeader>
          <Card className="pointer-events-none min-h-55 flex-1 flex-col flex-wrap overflow-x-auto bg-[color-mix(in_srgb,var(--color-card),var(--color-sidebar))] dark:bg-background">
            <CardPanel className="flex flex-1 items-center justify-center px-8 [--border:--alpha(var(--color-black)/7%)] [--btn-from:--alpha(var(--color-primary)/90%)] [--btn-to:var(--color-primary)] dark:[--border:--alpha(var(--color-white)/3%)] dark:[--btn-from:var(--color-primary)] dark:[--btn-to:--alpha(var(--color-primary)/90%)]">
              {thumbnail}
            </CardPanel>
          </Card>
        </CardFrame>
      </motion.div>
    </motion.div>
  );
}
