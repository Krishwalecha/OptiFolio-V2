import { motion } from "framer-motion";
import { ShoppingCart, X, ArrowRight } from "lucide-react";
import { Z } from "@/features/news/config";

export default function CartToast({
  cartCount,
  onGoToOptimizer,
  onDismiss,
}: {
  cartCount: number;
  onGoToOptimizer: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: Z.cartToast,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        background: "hsl(var(--foreground))",
        color: "hsl(var(--background))",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        fontSize: "13px",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      <ShoppingCart size={14} />
      <span>
        {cartCount} stock{cartCount > 1 ? "s" : ""} in cart
      </span>
      <button
        onClick={onGoToOptimizer}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 12px",
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "none",
          borderRadius: "7px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Go to Optimizer <ArrowRight size={11} />
      </button>
      <button
        onClick={onDismiss}
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "4px",
          background: "rgba(255,255,255,0.12)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--background))",
        }}
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}
