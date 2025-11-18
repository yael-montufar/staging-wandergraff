import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

console.log("[SUPABASE_INIT] URL:", supabaseUrl);
console.log("[SUPABASE_INIT] Key length:", supabaseServiceRoleKey.length);
console.log("[SUPABASE_INIT] Key starts with:", supabaseServiceRoleKey.substring(0, 30));
console.log("[SUPABASE_INIT] Key ends with:", supabaseServiceRoleKey.substring(supabaseServiceRoleKey.length - 30));

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
