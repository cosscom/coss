import { describe, expect, mock, test } from "bun:test";
import type * as React from "react";

function componentMock() {
  return null;
}

mock.module("@coss/ui/components/input", () => ({
  Input: componentMock,
}));

mock.module("@coss/ui/components/textarea", () => ({
  Textarea: componentMock,
}));

mock.module("@coss/ui/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

const { InputGroupAddon } = await import("../../src/components/input-group");

type MouseDownHandler = NonNullable<React.ComponentProps<"div">["onMouseDown"]>;

function getMouseDownHandler(): MouseDownHandler {
  const element = InputGroupAddon({});
  const props = element.props as React.ComponentProps<"div">;

  if (!props.onMouseDown) {
    throw new Error("InputGroupAddon does not have an onMouseDown handler");
  }

  return props.onMouseDown;
}

function createMouseDownEvent({
  contains,
  interactive = false,
}: {
  contains: boolean;
  interactive?: boolean;
}) {
  let focused = false;
  let prevented = false;

  const target = {
    closest: () => (interactive ? {} : null),
  } as unknown as Element;
  const input = {
    focus: () => {
      focused = true;
    },
  };
  const parentElement = {
    querySelector: (selector: string) => {
      if (selector === "input, textarea") return input;
      if (selector === "input:focus, textarea:focus") return null;
      return null;
    },
  };
  const currentTarget = {
    contains: () => contains,
    parentElement,
  } as unknown as HTMLDivElement;
  const event = {
    currentTarget,
    preventDefault: () => {
      prevented = true;
    },
    target,
  } as unknown as React.MouseEvent<HTMLDivElement>;

  return {
    event,
    wasFocused: () => focused,
    wasPrevented: () => prevented,
  };
}

describe("InputGroupAddon", () => {
  test("focuses the input for non-interactive content inside the addon", () => {
    const handler = getMouseDownHandler();
    const { event, wasFocused, wasPrevented } = createMouseDownEvent({
      contains: true,
    });

    handler(event);

    expect(wasPrevented()).toBe(true);
    expect(wasFocused()).toBe(true);
  });

  test("does not focus the input for interactive content inside the addon", () => {
    const handler = getMouseDownHandler();
    const { event, wasFocused, wasPrevented } = createMouseDownEvent({
      contains: true,
      interactive: true,
    });

    handler(event);

    expect(wasPrevented()).toBe(false);
    expect(wasFocused()).toBe(false);
  });

  test("ignores events from portaled descendants outside the addon", () => {
    const handler = getMouseDownHandler();
    const { event, wasFocused, wasPrevented } = createMouseDownEvent({
      contains: false,
    });

    handler(event);

    expect(wasPrevented()).toBe(false);
    expect(wasFocused()).toBe(false);
  });
});
