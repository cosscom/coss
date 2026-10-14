import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { SignOutButton } from "@/components/sign-out-button";
import { requireSession } from "@/lib/session";
import { CreateOrganizationForm } from "./create-organization-form";

export const metadata: Metadata = { title: "Create an organization" };

export default async function OnboardingPage() {
  await requireSession();
  return (
    <AuthFrame>
      <div className="flex flex-col gap-6">
        <CreateOrganizationForm />
        <div className="flex justify-center border-t pt-4">
          <SignOutButton />
        </div>
      </div>
    </AuthFrame>
  );
}
