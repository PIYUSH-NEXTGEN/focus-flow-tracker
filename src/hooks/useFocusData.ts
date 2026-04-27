import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mode, PauseEvent, SessionRow, SessionWithTags, TagRow } from "@/lib/focus";
import { useAuth } from "./useAuth";

export function useTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tags", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TagRow[]> => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as TagRow[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string): Promise<TagRow> => {
      if (!user) throw new Error("Not authenticated");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Tag name required");
      const { data, error } = await supabase
        .from("tags")
        .insert({ name: trimmed, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as TagRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sessions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SessionWithTags[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, session_tags(tag_id, tags(*))")
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...(row as SessionRow),
        pause_events: (row.pause_events ?? []) as PauseEvent[],
        tags: (row.session_tags ?? [])
          .map((st: any) => st.tags)
          .filter(Boolean) as TagRow[],
      }));
    },
  });
}

interface CreateSessionInput {
  mode: Mode;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  target_seconds: number | null;
  pause_events: PauseEvent[];
  tag_ids: string[];
}

export function useCreateSession() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateSessionInput): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          mode: input.mode,
          start_time: input.start_time,
          end_time: input.end_time,
          duration_seconds: input.duration_seconds,
          target_seconds: input.target_seconds,
          pause_events: input.pause_events as any,
        })
        .select()
        .single();
      if (error) throw error;
      const sessionId = (data as { id: string }).id;
      if (input.tag_ids.length > 0) {
        const { error: tagErr } = await supabase
          .from("session_tags")
          .insert(input.tag_ids.map((tag_id) => ({ session_id: sessionId, tag_id })));
        if (tagErr) throw tagErr;
      }
      return sessionId;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sessions"] });
      await qc.refetchQueries({ queryKey: ["sessions"] });
    },
  });
}

interface UpdateSessionInput {
  id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  tag_ids: string[];
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSessionInput) => {
      const { error } = await supabase
        .from("sessions")
        .update({
          start_time: input.start_time,
          end_time: input.end_time,
          duration_seconds: input.duration_seconds,
        })
        .eq("id", input.id);
      if (error) throw error;
      // Replace tags: delete then insert.
      const { error: delErr } = await supabase
        .from("session_tags")
        .delete()
        .eq("session_id", input.id);
      if (delErr) throw delErr;
      if (input.tag_ids.length > 0) {
        const { error: insErr } = await supabase
          .from("session_tags")
          .insert(input.tag_ids.map((tag_id) => ({ session_id: input.id, tag_id })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
