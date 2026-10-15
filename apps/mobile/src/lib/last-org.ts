import * as SecureStore from "expo-secure-store";

const KEY = "coss.last-org";

export function rememberOrganization(slug: string): void {
  void SecureStore.setItemAsync(KEY, slug).catch(() => {});
}

export async function lastOrganization(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY).catch(() => null);
}

export async function forgetOrganization(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}
