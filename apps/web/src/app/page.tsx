import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

/** Entry point: sign in, create a first organization, or open the first organization. */
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const organizations = await auth.api.listOrganizations({ headers: await headers() });
  const [first] = organizations.toSorted((a, b) => a.name.localeCompare(b.name));
  redirect(first ? `/${first.slug}` : "/onboarding");
}
