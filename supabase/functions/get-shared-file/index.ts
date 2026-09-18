import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEXT_EXTS = [
  "md", "markdown", "txt", "json", "js", "jsx", "ts", "tsx", "css", "scss", "less",
  "html", "htm", "xml", "yml", "yaml", "csv", "tsv", "log", "ini", "conf", "env",
  "sh", "bash", "py", "java", "c", "cpp", "h", "hpp", "go", "rs", "rb", "php",
  "sql", "vue", "svelte", "swift", "kt", "kts", "gradle", "toml", "editorconfig",
  "gitignore", "dockerfile", "makefile", "properties",
];

function getContentType(name: string, mimeType: string | null): string {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const mime = mimeType ?? "";
  const isTextual =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime === "application/x-javascript" ||
    TEXT_EXTS.includes(ext);
  if (isTextual) return "text/plain; charset=utf-8";
  return mime || "application/octet-stream";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const download = url.searchParams.get("download") === "1";
  if (!token) {
    return new Response("missing token", { status: 400, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: share } = await supabaseAdmin
    .from("drive_shares")
    .select("file_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!share || new Date(share.expires_at).getTime() < Date.now()) {
    return new Response("share not found or expired", { status: 404, headers: corsHeaders });
  }

  const { data: file } = await supabaseAdmin
    .from("drive_files")
    .select("name, storage_path, mime_type")
    .eq("id", share.file_id)
    .maybeSingle();

  if (!file) {
    return new Response("file not found", { status: 404, headers: corsHeaders });
  }

  const { data: blob, error } = await supabaseAdmin.storage
    .from("private")
    .download(file.storage_path);

  if (error || !blob) {
    return new Response("download failed", { status: 500, headers: corsHeaders });
  }

  const contentType = getContentType(file.name, file.mime_type);
  const disposition = download
    ? `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`
    : `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`;

  return new Response(blob, {
    headers: {
      ...corsHeaders,
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=3600",
    },
  });
});