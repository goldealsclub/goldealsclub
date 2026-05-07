import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ArrowLeft, History } from "lucide-react";
import VideoHistory from "@/components/admin/VideoHistory";

export default function AdminVideoHistoryPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Historique vidéos — Admin";
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  if (isAdmin === null) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          to="/admin/video"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour Vidéo du jour
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <History className="h-7 w-7" /> Historique des vidéos
      </h1>
      <p className="text-muted-foreground mb-6">
        Toutes les vidéos Battle générées et archivées dans le cloud.
      </p>

      <VideoHistory />
    </div>
  );
}
