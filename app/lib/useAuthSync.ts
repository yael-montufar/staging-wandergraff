import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

/**
 * Hook that ensures the auth state is synchronized when navigating
 * through browser history (back/forward buttons). This prevents stale
 * auth state from cached pages.
 */
export function useAuthSync() {
  const revalidator = useRevalidator();
  const revalidationTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handlePopState = () => {
      // Debounce revalidation to avoid multiple concurrent requests
      if (revalidationTimeoutRef.current) {
        clearTimeout(revalidationTimeoutRef.current);
      }

      revalidationTimeoutRef.current = setTimeout(() => {
        try {
          revalidator.revalidate();
        } catch (error) {
          // Ignore abort errors that occur during revalidation
          if (error instanceof Error && error.message.includes("aborted")) {
            console.debug("[useAuthSync] Revalidation was aborted (expected)");
          } else {
            console.error("[useAuthSync] Error revalidating:", error);
          }
        }
      }, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (revalidationTimeoutRef.current) {
        clearTimeout(revalidationTimeoutRef.current);
      }
    };
  }, [revalidator]);
}
