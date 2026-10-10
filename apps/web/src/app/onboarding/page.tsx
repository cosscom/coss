import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";
import { requireSession } from "@/lib/session";
import { CreateOrganizationForm } from "./create-organization-form";

export const metadata: Metadata = { title: "Create an organization" };

export default async function OnboardingPage() {
  await requireSession();
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <CreateOrganizationForm />
        <div className="flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
