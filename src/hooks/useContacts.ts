import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface ContactInsert {
  name: string;
  phone_number: string;
}

export interface ContactUpdate {
  id: string;
  name?: string;
  phone_number?: string;
}

export const useContacts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};
