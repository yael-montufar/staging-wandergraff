import { useCallback, useEffect } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";

/**
 * Hook that validates the current auth state against the loader data.
 * Detects mismatches from browser bfcache (back/forward cache) and triggers
 * a revalidation to fetch fresh auth data, preventing stale UI states.
 */
export function useAuthStateValidation() {
  const revalidator = useRevalidator();
  const rootData = useRouteLoaderData("root") as any;

  const validateAuthState = useCallback(() => {
    // Skip validation on auth callback page since we're in the middle of OAuth processing
    // The ref in the callback component prevents double-processing
    if (typeof window !== "undefined" && window.location.pathname === "/auth/callback") {
      return false;
    }

    // Get current auth token from cookie
    const cookies = document.cookie.split(";");
    let authToken: string | null = null;

    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "auth-token" && value) {
        authToken = decodeURIComponent(value);
        break;
      }
    }

    // Check if loader data matches actual auth state
    const hasLoaderUser = !!rootData?.user;
    const hasAuthToken = !!authToken;

    // If there's a mismatch, revalidate to get fresh data
    if (hasLoaderUser !== hasAuthToken) {
      revalidator.revalidate();
      return true;
    }
    return false;
  }, [rootData?.user, revalidator]);

  // Validate immediately after rendering and before visible paint
  // This catches stale bfcache state early
  useEffect(() => {
    // Schedule validation as early as possible before the browser paints
    // Using a 0ms timeout executes after layout/paint phase but before visual update
    const timeoutId = setTimeout(() => {
      validateAuthState();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [validateAuthState]);

  // Also validate when tab becomes visible (switching focus back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateAuthState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [validateAuthState]);
}
