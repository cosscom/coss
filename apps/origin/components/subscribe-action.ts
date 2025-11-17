"use server";

import { z } from "zod";

type EmailOctopusError = {
  code?: string;
  detail?: string;
  title?: string;
};

const subscribeSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

type SubscribeResult = { success: true } | { success: false; error: string };

export async function subscribe(email: string): Promise<SubscribeResult> {
  // Check environment variables and return error instead of throwing
  if (!process.env.EMAIL_OCTOPUS_API_KEY) {
    console.error("Missing EMAIL_OCTOPUS_API_KEY environment variable");
    return {
      error: "Service configuration error. Please try again later.",
      success: false,
    };
  }

  if (!process.env.EMAIL_OCTOPUS_LIST_ID) {
    console.error("Missing EMAIL_OCTOPUS_LIST_ID environment variable");
    return {
      error: "Service configuration error. Please try again later.",
      success: false,
    };
  }

  const result = subscribeSchema.safeParse({ email: email.trim() });
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message || "Invalid email format.",
      success: false,
    };
  }

  try {
    console.log("Attempting to subscribe email:", result.data.email);

    const response = await fetch(
      `https://api.emailoctopus.com/lists/${process.env.EMAIL_OCTOPUS_LIST_ID}/contacts`,
      {
        body: JSON.stringify({
          email_address: result.data.email,
          fields: {},
          status: "subscribed",
          tags: [],
        }),
        headers: {
          Authorization: `Bearer ${process.env.EMAIL_OCTOPUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    const data = (await response.json()) as EmailOctopusError;

    // Always log API errors for debugging
    if (!response.ok) {
      console.error("EmailOctopus API Error:", {
        data,
        email: result.data.email,
        status: response.status,
        statusText: response.statusText,
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return {
          error: "Too many attempts. Please try again later.",
          success: false,
        };
      }

      // Provide more specific error messages based on status codes
      if (response.status === 400) {
        return {
          error: data.detail || data.title || "Invalid email address.",
          success: false,
        };
      }

      if (response.status === 401) {
        console.error("EmailOctopus API authentication failed");
        return {
          error: "Service configuration error. Please try again later.",
          success: false,
        };
      }

      return {
        error:
          data.detail || data.title || "Failed to subscribe. Please try again.",
        success: false,
      };
    }

    console.log("Successfully subscribed email:", result.data.email);
    return { success: true };
  } catch (error) {
    console.error("Unexpected error during subscription:", {
      email: result.data.email,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      error: "Network error. Please check your connection and try again.",
      success: false,
    };
  }
}
