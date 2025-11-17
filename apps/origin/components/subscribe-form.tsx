"use client";

import { RiLoader3Line, RiNavigationLine } from "@remixicon/react";
import { useId, useState } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { Input } from "@/registry/default/ui/input";

import { subscribe } from "./subscribe-action";

// Add type for form state
type FormStatus = "idle" | "loading" | "success" | "error";

function Form() {
  const id = useId();
  const [formState, setFormState] = useState({
    email: "",
    message: "",
    status: "idle" as FormStatus,
  });

  const isLoading = formState.status === "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState((prev) => ({ ...prev, message: "", status: "loading" }));

    try {
      const result = await subscribe(formState.email);
      if (!result.success) {
        setFormState((prev) => ({
          ...prev,
          message: result.error,
          status: "error",
        }));
      } else {
        setFormState({
          email: "",
          message: "Thanks for subscribing!",
          status: "success",
        });
      }
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        message: error instanceof Error ? error.message : "Failed to subscribe",
        status: "error",
      }));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="inline-flex gap-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground peer-disabled:opacity-50">
              <RiNavigationLine
                aria-hidden="true"
                className="-scale-x-100"
                size={16}
              />
            </div>
            <Input
              aria-label="Subscribe to the newsletter"
              className="h-10 flex-1 rounded-full border-zinc-600/65 bg-zinc-700/30 ps-9 text-zinc-100 placeholder:text-zinc-500 md:min-w-64 [&:-webkit-autofill]:bg-zinc-700/30 [&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[transition:background-color_5000000s_ease-in-out_0s]"
              disabled={isLoading || undefined}
              id={id}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Enter your email..."
              required
              type="email"
              value={formState.email}
            />
          </div>
          <Button
            className="group relative h-10 rounded-full"
            data-loading={isLoading}
            disabled={isLoading}
            type="submit"
          >
            <span className="group-data-[loading=true]:text-transparent">
              Subscribe
            </span>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RiLoader3Line
                  aria-hidden="true"
                  className="animate-spin"
                  size={16}
                />
              </div>
            )}
          </Button>
        </div>
        {formState.message && (
          <p
            aria-live="polite"
            className={cn(
              "absolute mt-2 text-xs",
              formState.status === "error"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
            role="alert"
          >
            {formState.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function SubscribeBottom() {
  return (
    <div className="dark relative overflow-hidden rounded-xl bg-zinc-900 px-4 py-14 sm:px-8">
      <Illustration
        aria-hidden="true"
        className="-translate-x-1/2 absolute top-0 left-0"
      />
      <Illustration
        aria-hidden="true"
        className="absolute right-0 bottom-0 translate-x-1/4"
      />
      <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
        <h2 className="font-heading text-2xl/[1.1] text-foreground md:text-3xl/[1.1]">
          Get notified when new stuff drops.
        </h2>
        <Form />
      </div>
    </div>
  );
}

function Illustration({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="268"
      width="267"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter={`url(#${id}a)`} style={{ mixBlendMode: "plus-lighter" }}>
        <path
          d="M189 76.284 242.642 24 189 83.753v19.691l-8.148-6.11L24 244 176.099 89.864v-13.58H189Z"
          fill="#fff"
          fillOpacity=".48"
        />
      </g>
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="268"
          id={`${id}a`}
          width="266.642"
          x="0"
          y="0"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_809_24"
            stdDeviation="12"
          />
        </filter>
      </defs>
    </svg>
  );
}
