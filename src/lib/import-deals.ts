import { supabase } from "@/integrations/supabase/client";
import dealsJson from "../../public/deals.json";

/**
 * Import deals from the local JSON file into the database.
 * Call this once to seed the DB, or whenever the JSON is updated.
 */
export async function importDealsToDb(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("import-deals", {
      body: dealsJson,
    });

    if (error) throw error;
    return { success: true, count: data?.count || 0 };
  } catch (err: any) {
    console.error("Import deals error:", err);
    return { success: false, count: 0, error: err.message };
  }
}
