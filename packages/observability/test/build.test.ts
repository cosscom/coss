import { expect, test } from "bun:test";
import { sentryBuildOptions } from "../src/build.ts";

test("source maps are deleted after upload and disabled without upload credentials", () => {
  const original = process.env.SENTRY_AUTH_TOKEN;
  try {
    process.env.SENTRY_AUTH_TOKEN = "test-token";
    expect(sentryBuildOptions().sourcemaps).toEqual({
      disable: false,
      deleteSourcemapsAfterUpload: true,
    });
    delete process.env.SENTRY_AUTH_TOKEN;
    expect(sentryBuildOptions().sourcemaps.disable).toBe(true);
  } finally {
    if (original === undefined) delete process.env.SENTRY_AUTH_TOKEN;
    else process.env.SENTRY_AUTH_TOKEN = original;
  }
});
