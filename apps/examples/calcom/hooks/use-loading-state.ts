import { useEffect, useState } from "react";
import { useDebug } from "@/components/debug-context";

/**
 * Custom hook to manage loading state with artificial delay support
 * @param delayMs - The artificial delay in milliseconds
 * @returns Whether to show the loading state
 */
export function useLoadingState(delayMs: number) {
  const { enableArtificialDelay, isLoadingOverride } = useDebug();
  const [isLoading, setIsLoading] = useState(enableArtificialDelay);

  useEffect(() => {
    if (!enableArtificialDelay) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [enableArtificialDelay, delayMs]);

  return isLoadingOverride ?? isLoading;
}
