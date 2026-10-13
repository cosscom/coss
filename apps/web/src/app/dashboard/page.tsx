import { listUserOrganizations } from "@coss/tenancy";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** Entry point: sign in, create a first organization, or open the first organization. */
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [first] = await listUserOrganizations({ userId: session.user.id });
  redirect(first ? `/${first.slug}` : "/onboarding");
}
