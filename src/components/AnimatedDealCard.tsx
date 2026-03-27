import { motion } from "framer-motion";
import DealCard from "./DealCard";
import type { Deal } from "@/lib/data";

interface AnimatedDealCardProps {
  deal: Deal;
  index: number;
  featured?: boolean;
}

const AnimatedDealCard = ({ deal, index, featured }: AnimatedDealCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
  >
    <DealCard deal={deal} featured={featured} />
  </motion.div>
);

export default AnimatedDealCard;