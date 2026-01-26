import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MakeCallParams {
  reminderId: string;
  recipientName: string;
  phoneNumber: string;
  message: string;
  voice: string;
  customVoiceId?: string | null;
}

export const useMakeCall = () => {
  const [isLoading, setIsLoading] = useState(false);

  const makeCall = async (params: MakeCallParams) => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to make a call");
      }

      const { data, error } = await supabase.functions.invoke("make-call", {
        body: {
          ...params,
          userId: user.id,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to initiate call");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Call initiated!",
        description: "You should receive the call shortly.",
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to make call";
      toast({
        title: "Call failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { makeCall, isLoading };
};
