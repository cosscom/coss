import { describe, expect, it } from "bun:test";
import { splitChatMessagePreview } from "../../registry/default/chat/lib/split-chat-message-preview";

describe("chat message preview", () => {
  it("leaves short text whole and prefers paragraph boundaries", () => {
    expect(splitChatMessagePreview("Short note")).toEqual({
      preview: "Short note",
      remainder: null,
    });
    const longMessage = `${"A useful sentence. ".repeat(26)}\n\nMore detail follows.`;
    expect(splitChatMessagePreview(longMessage)).toEqual({
      preview: "A useful sentence. ".repeat(26).trimEnd(),
      remainder: "More detail follows.",
    });
  });

  it.each([
    " ",
    "\t",
    "\n",
    "\u3000",
  ])("uses a %j boundary before cutting a word", (separator) => {
    expect(
      splitChatMessagePreview(`First${separator}continuation`, 12),
    ).toEqual({
      preview: "First",
      remainder: "continuation",
    });
  });

  it.each([
    "🎉",
    "🇯🇵",
    "👩🏽‍💻",
    "e\u0301",
  ])("keeps %s intact at the preview boundary", (grapheme) => {
    const prefix = "字".repeat(499);
    expect(splitChatMessagePreview(`${prefix}${grapheme}続き`)).toEqual({
      preview: prefix,
      remainder: `${grapheme}続き`,
    });
  });

  it("keeps an initial grapheme whole when it exceeds the limit", () => {
    expect(splitChatMessagePreview("👩🏽‍💻続き", 1)).toEqual({
      preview: "👩🏽‍💻",
      remainder: "続き",
    });
  });

  it("does not split a surrogate pair when Intl.Segmenter is unavailable", () => {
    const segmenter = Intl.Segmenter;
    Reflect.set(Intl, "Segmenter", undefined);
    try {
      const prefix = "字".repeat(499);
      expect(splitChatMessagePreview(`${prefix}🎉続き`)).toEqual({
        preview: prefix,
        remainder: "🎉続き",
      });
      expect(splitChatMessagePreview("🎉続き", 1)).toEqual({
        preview: "🎉",
        remainder: "続き",
      });
    } finally {
      Reflect.set(Intl, "Segmenter", segmenter);
    }
  });
});
