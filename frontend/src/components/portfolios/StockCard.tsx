import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import StockChart from "@/components/charts/StockChart";
import type { PortfolioStock } from "@/features/portfolios/types";

interface StockCardProps {
  stock: PortfolioStock;
  index: number;
  onDelete: (stock: PortfolioStock) => void;
}

export default function StockCard({ stock, index, onDelete }: StockCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <StockChart ticker={stock.ticker} allocation={stock.allocation} investedInr={stock.investedInr} />

      {/* Corner delete button — appears on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(stock);
            }}
            title={`Remove ${stock.ticker}`}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 20,
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.25)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)")
            }
          >
            <Trash2 size={12} style={{ color: "#ef4444" }} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
