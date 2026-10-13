// The parts of the browser SDK that instrumentation-client.ts and global-error.tsx use, loaded on
// demand: named exports only, so the bundler leaves out the rest (Session Replay, feedback…).
export {
  browserTracingIntegration,
  captureException,
  captureRouterTransitionStart,
  init,
} from "@sentry/nextjs";
