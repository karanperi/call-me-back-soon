import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

export type CallHistory = Tables<"call_history"> & {
  error_message?: string | null;
};

export const useCallHistory = (filter?: "completed" | "missed" | "voicemail" | "failed" | "in_progress" | "pending") => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["call_history", user?.id, filter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("call_history")
        .select("*")
        .eq("user_id", user.id)
        .order("attempted_at", { ascending: false });

      if (filter) {
        // Specific filter requested - return only that status
        query = query.eq("status", filter);
      } else {
        // "All" filter - exclude in-progress and pending calls
        // These should only appear in the Active calls list on Home page
        query = query.not("status", "in", "(in_progress,pending)");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CallHistory[];
    },
    enabled: !!user,
  });
};
