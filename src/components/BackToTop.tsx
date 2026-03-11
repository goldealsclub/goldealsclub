import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-foreground/80 transition-all animate-fade-in"
      aria-label="Retour en haut"
    >
      <ArrowUp className="w-4 h-4" strokeWidth={1.5} />
    </button>
  );
};

export default BackToTop;
