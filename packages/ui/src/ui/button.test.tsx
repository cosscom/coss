import { beforeEach, describe, expect, mock, test } from "bun:test";

type ButtonRenderCall = Record<string, unknown> & {
  className?: string;
  "data-slot"?: string;
  type?: "button" | "submit" | "reset";
  render?: unknown;
  disabled?: boolean;
  "aria-label"?: string;
};

const buttonRenderCalls: ButtonRenderCall[] = [];
const cnCalls: string[][] = [];

function mockButtonPrimitive(props: ButtonRenderCall) {
  buttonRenderCalls.push(props);
  return null;
}

const ButtonPrimitiveMock = Object.assign(mockButtonPrimitive, {
  Props: {} as Record<string, unknown>,
});

function cnMock(...inputs: string[]) {
  cnCalls.push(inputs);
  return inputs.filter(Boolean).join(" ");
}

mock.module("@base-ui-components/react/button", () => ({
  Button: ButtonPrimitiveMock,
}));

mock.module("@coss/ui/lib/utils", () => ({
  cn: cnMock,
}));

const { Button: ButtonComponent } = await import("./button");

// Mock the Button component to track render calls
function Button(props: Parameters<typeof ButtonComponent>[0]) {
  const element = ButtonComponent(props);
  (element.type as (props: unknown) => unknown)(element.props);
}

function lastButtonCall() {
  const lastCall = buttonRenderCalls[buttonRenderCalls.length - 1];
  if (!lastCall) {
    throw new Error("Button was not called");
  }
  return lastCall;
}

describe("Button", () => {
  beforeEach(() => {
    buttonRenderCalls.length = 0;
    cnCalls.length = 0;
  });

  test("sets base attributes with data-slot", () => {
    Button({ children: "Default label" });

    const call = lastButtonCall();
    expect(call["data-slot"]).toBe("button");
  });

  test("accepts custom render function", () => {
    const render = <span />;
    Button({ render, type: "submit" });

    const call = lastButtonCall();
    expect(call.render).toBe(render);
    expect(call.type).toBe("submit");
  });

  test("merges variants, sizes, and custom className", () => {
    Button({
      className: "custom-class",
      size: "lg",
      variant: "destructive",
    });

    const call = lastButtonCall();
    const className = call.className as string;
    expect(className).toContain("border-destructive");
    expect(className).toContain("min-h-9");
    expect(className).toContain("custom-class");
  });

  test("applies default variant and size styles", () => {
    Button({});

    const call = lastButtonCall();
    const className = call.className as string;
    expect(className).toContain("border-primary");
    expect(className).toContain("bg-primary");
    expect(className).toContain("min-h-8");
  });

  test("passes through additional props", () => {
    Button({ "aria-label": "Custom button", disabled: true });

    const call = lastButtonCall();
    expect(call["aria-label"]).toBe("Custom button");
    expect(call.disabled).toBe(true);
  });
});
