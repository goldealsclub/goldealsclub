import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (authLoading) {
      setLoading(true);
      return () => {
        isMounted = false;
      };
    }

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        setIsAdmin(Boolean(data) && !error);
        setLoading(false);
      }, () => {
        if (!isMounted) return;
        setIsAdmin(false);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  return { isAdmin, loading };
}