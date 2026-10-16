import { describe, expect, test } from "bun:test";
import { describeUserAgent } from "../src/lib/user-agent";

describe("describeUserAgent", () => {
  test("names common browsers and systems", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on macOS");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      ),
    ).toBe("Edge on Windows");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iOS");
    expect(
      describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0"),
    ).toBe("Firefox on Linux");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome on Android");
  });

  test("names the coss.com iOS app", () => {
    expect(describeUserAgent("COSS-iOS/1.0.0")).toBe("coss.com app on iOS");
    expect(describeUserAgent("coss.com/3 CFNetwork/3860.100.1 Darwin/25.0.0")).toBe(
      "coss.com app on iOS",
    );
    expect(describeUserAgent("COSSfoo/1")).toBe("COSSfoo/1");
  });

  test("falls back to the (shortened) raw value or a placeholder", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
    expect(describeUserAgent("")).toBe("Unknown device");
    expect(describeUserAgent("curl/8.9.1")).toBe("curl/8.9.1");
    expect(describeUserAgent("x".repeat(60))).toHaveLength(48);
  });
});
