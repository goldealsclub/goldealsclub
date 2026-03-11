import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <p className="font-display text-[120px] md:text-[180px] leading-none tracking-wider text-foreground/5 select-none">
          404
        </p>
        <h1 className="font-display text-xl md:text-2xl uppercase tracking-[0.2em] -mt-8 mb-4">
          Page introuvable
        </h1>
        <p className="font-body text-sm text-foreground/50 mb-8 max-w-sm mx-auto">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-[11px] font-display uppercase tracking-[0.2em] hover:bg-foreground/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
