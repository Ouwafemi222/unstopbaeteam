import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "attachments";

export function monthlyPlanImagePath(
  teamMemberId: string,
  yearMonth: string,
  kind: "goals" | "evaluation",
  ext: string
) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `monthly-plans/${teamMemberId}/${yearMonth}/${kind}-${Date.now()}.${safeExt}`;
}

export async function uploadMemberImage(
  supabase: SupabaseClient,
  file: File,
  storagePath: string
) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return storagePath;
}

export async function getMemberImageUrl(supabase: SupabaseClient, storagePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
