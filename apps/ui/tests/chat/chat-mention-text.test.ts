import { describe, expect, it } from "bun:test";
import {
  deleteMentionBackward,
  getMentionQuery,
  insertMention,
} from "../../registry/default/chat/lib/chat-mention-text";

describe("chat mention text", () => {
  it("queries and removes supplied non-Latin handles atomically", () => {
    const text = "Hello @Renée_2";
    expect(getMentionQuery(text, text.length)).toEqual({
      start: 6,
      end: text.length,
      query: "Renée_2",
    });
    expect(deleteMentionBackward(text, text.length)).toEqual({
      text: "Hello ",
      caret: 6,
    });
    expect(getMentionQuery("@美", 2)).toEqual({
      start: 0,
      end: 2,
      query: "美",
    });
  });

  it("ignores email addresses and plain text", () => {
    expect(getMentionQuery("test@example.com", 8)).toBeNull();
    expect(getMentionQuery("Hello Maya", 10)).toBeNull();
  });

  it("replaces the whole mention at the caret while preserving the rest of the draft", () => {
    const text = "Hello @Maya, see you later";
    const mention = getMentionQuery(text, 9);
    expect(mention).toEqual({ start: 6, end: 11, query: "Ma" });
    if (!mention) throw new Error("Expected a mention at the caret");
    expect(insertMention(text, mention, "Jordan")).toEqual({
      text: "Hello @Jordan, see you later",
      caret: 13,
    });
  });

  it("keeps one separating space and preserves line breaks", () => {
    expect(
      insertMention("Hi @M there", { start: 3, end: 5, query: "M" }, "Maya"),
    ).toEqual({
      text: "Hi @Maya there",
      caret: 9,
    });
    expect(getMentionQuery("Hello\n@", 7)).toEqual({
      start: 6,
      end: 7,
      query: "",
    });
  });

  it("removes a whole mention on word-backspace without leaving an at sign", () => {
    expect(deleteMentionBackward("Hi @Maya ", 9)).toEqual({
      text: "Hi ",
      caret: 3,
    });
    expect(deleteMentionBackward("Hi @Maya there", 9)).toEqual({
      text: "Hi there",
      caret: 3,
    });
    expect(deleteMentionBackward("Hi @Maya and Alex", 16)).toBeNull();
    expect(deleteMentionBackward("test@example.com", 16)).toBeNull();
  });
});
