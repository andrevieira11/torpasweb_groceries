"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ItemView } from "../ItemRow";

/** Rows that slide in when added, collapse away when removed and glide when re-ordered. */
export function ItemList({
  items,
  render,
}: {
  items: ItemView[];
  render: (item: ItemView) => React.ReactNode;
}) {
  return (
    <ul className="flex flex-col divide-y divide-hairline/60">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout="position"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            // A row on its way out takes no taps: the next row is sliding up under the finger.
            exit={{ opacity: 0, height: 0, pointerEvents: "none", transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 520, damping: 40 }}
            className="overflow-hidden"
          >
            {render(item)}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
