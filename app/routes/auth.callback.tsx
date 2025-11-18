import { type LoaderFunction, redirect } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    console.error("[CALLBACK] Auth error:", error, errorDescription);
    return redirect(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (code) {
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
  }

  return { hasFragment: true };
};

export default function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleHashAuth = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error("[CALLBACK] Missing Supabase environment variables");
          navigate("/auth/login?error=Server+configuration+error");
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        console.log("[CALLBACK] Processing OAuth callback with fragment tokens");

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[CALLBACK] Error getting session:", error);
          navigate(`/auth/login?error=${encodeURIComponent(error.message)}`);
          return;
        }

        if (data.session) {
          console.log("[CALLBACK] Session established via OAuth");
          document.cookie = `auth-token=${data.session.access_token}; path=/; SameSite=Lax`;
          navigate("/");
        } else {
          console.error("[CALLBACK] No session in fragment");
          navigate("/auth/login?error=No+session+found");
        }
      } catch (error) {
        console.error("[CALLBACK] Unexpected error:", error);
        navigate(
          `/auth/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`
        );
      }
    };

    handleHashAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h1>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
