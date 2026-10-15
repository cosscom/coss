import type { PushCategory, PushSettings } from "@coss/companion";
import {
  getPushDevice,
  PUSH_CATEGORIES,
  type PushDeviceRow,
  registerPushDevice,
  unregisterPushDevice,
  updatePushCategories,
} from "@coss/push";
import { registerPushDeviceSchema, updatePushCategoriesSchema } from "@coss/push/schemas";
import type { z } from "zod";
import { MobileApiError, mobileRoute, requireMobileSession } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

// The app's wire type lists the same categories.
const CATEGORIES: readonly PushCategory[] = PUSH_CATEGORIES;

function pushSettings(device: PushDeviceRow | null): PushSettings {
  const categories = Object.fromEntries(
    CATEGORIES.map((category) => [category, device?.categories.includes(category) ?? true]),
  ) as PushSettings["categories"];
  return { registered: device !== null, categories };
}

async function body<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema>> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new MobileApiError(400, "invalid_request", "That isn't a valid push registration.");
  }
  return parsed.data;
}

export const GET = mobileRoute(async (request): Promise<PushSettings> => {
  const { session } = await requireMobileSession(request);
  return pushSettings(await getPushDevice(session.id));
});

export const PUT = mobileRoute(async (request): Promise<PushSettings> => {
  const { session, user } = await requireMobileSession(request);
  const input = await body(request, registerPushDeviceSchema);
  const device = await registerPushDevice({
    userId: user.id,
    sessionId: session.id,
    token: input.token,
    apnsEnvironment: input.apns_environment,
    categories: input.categories,
  });
  return pushSettings(device);
});

export const PATCH = mobileRoute(async (request): Promise<PushSettings> => {
  const { session } = await requireMobileSession(request);
  const input = await body(request, updatePushCategoriesSchema);
  const device = await updatePushCategories(session.id, input.categories);
  if (!device) throw new MobileApiError(404, "not_found", "Turn on notifications first.");
  return pushSettings(device);
});

export const DELETE = mobileRoute(async (request): Promise<PushSettings> => {
  const { session } = await requireMobileSession(request);
  await unregisterPushDevice(session.id);
  return pushSettings(null);
});
