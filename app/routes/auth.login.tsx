import { type ActionFunction, redirect, useActionData } from "react-router";
import { createClient } from "@supabase/supabase-js";

type ActionData = {
  error?: string;
};

export const action: ActionFunction = async ({ request }): Promise<ActionData | Response> => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[LOGIN] Missing Supabase environment variables");
      return { error: "Server configuration error" };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("[LOGIN] Attempting to sign in user with email:", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[LOGIN] Supabase error:", error);
      return { error: error.message };
    }

    if (!data.session) {
      console.error("[LOGIN] No session returned from Supabase");
      return { error: "Failed to create session" };
    }

    console.log("[LOGIN] User signed in successfully");

    // Set auth cookie and redirect
    const response = redirect("/");
    response.headers.set(
      "Set-Cookie",
      `auth-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax`
    );
    return response;
  } catch (error) {
    console.error("[LOGIN] Unexpected error:", error);
    return { error: error instanceof Error ? error.message : "Login failed" };
  }
};

export default function LoginPage() {
  const actionData = useActionData<ActionData>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Wandergraff
          </h2>
        </div>
        {actionData?.error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-medium text-red-800">{actionData.error}</p>
          </div>
        )}
        <form className="mt-8 space-y-6" method="POST">
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
