import * as WebBrowser from "expo-web-browser";
import { DASHBOARD_URL } from "./config";

export type EnvironmentParams = { org: string; project: string; env: string };

/** The dashboard path of an environment; the app's routes mirror the dashboard's. */
export function environmentPath(params: EnvironmentParams): string {
  return `/${params.org}/projects/${params.project}/${params.env}`;
}

/** Opens a dashboard page (a path) in the in-app browser. */
export function openOnWeb(path: string): void {
  void WebBrowser.openBrowserAsync(`${DASHBOARD_URL}${path}`);
}
