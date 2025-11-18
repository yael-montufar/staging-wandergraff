import { type LoaderFunction, redirect } from "react-router";
import { createClient } from "@supabase/supabase-js";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    console.error("[CALLBACK] Auth error:", error, errorDescription);
    return redirect(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    console.error("[CALLBACK] No code provided");
    return redirect("/auth/login?error=No+code+provided");
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[CALLBACK] Missing Supabase environment variables");
      return redirect("/auth/login?error=Server+configuration+error");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("[CALLBACK] Exchanging code for session");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[CALLBACK] Error exchanging code:", error);
      return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
    }

    if (!data.session) {
      console.error("[CALLBACK] No session returned");
      return redirect("/auth/login?error=No+session+returned");
    }

    console.log("[CALLBACK] Session established");
    const response = redirect("/");
    response.headers.set(
      "Set-Cookie",
      `auth-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax`
    );
    return response;
  } catch (error) {
    console.error("[CALLBACK] Unexpected error:", error);
    return redirect(
      `/auth/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`
    );
  }
};

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirming your email...</h1>
        <p className="text-gray-600">Please wait while we confirm your email address.</p>
      </div>
    </div>
  );
}
