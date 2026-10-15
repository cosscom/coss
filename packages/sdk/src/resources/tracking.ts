import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type {
  DeletedTrackingRule,
  TrackingRule,
  TrackingSettings,
  UpdateTrackingRuleParams,
} from "../types/tracking.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const categoryPath = (category: string) =>
  `/v1/tracking_settings/categories/${encodeURIComponent(category)}`;

/**
 * `coss.email.tracking`: which emails of the API key's environment have their opens and clicks
 * tracked and get one-click unsubscribe headers. Emails keep the settings that applied when they
 * were sent; a send's own `tracking` option wins over them.
 */
export class TrackingResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.tracking`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The environment default and the category rules. */
  get(options?: ReadOptions): Promise<CossResult<TrackingSettings>> {
    return this.#http.request<TrackingSettings>({
      method: "GET",
      path: "/v1/tracking_settings",
      signal: options?.signal,
    });
  }

  /**
   * Sets the environment default, which applies to emails without a rule for their category.
   * Fields left out keep their value; a new default starts with both off.
   */
  updateDefault(
    params: UpdateTrackingRuleParams,
    options?: ReadOptions,
  ): Promise<CossResult<TrackingRule>> {
    return this.#http.request<TrackingRule>({
      method: "PATCH",
      path: "/v1/tracking_settings/default",
      body: params,
      signal: options?.signal,
    });
  }

  /** Removes the environment default: emails without a category rule are then not tracked. */
  removeDefault(options?: ReadOptions): Promise<CossResult<DeletedTrackingRule>> {
    return this.#http.request<DeletedTrackingRule>({
      method: "DELETE",
      path: "/v1/tracking_settings/default",
      signal: options?.signal,
    });
  }

  /**
   * Sets the rule for emails sent with `category`, which wins over the default. Fields left out
   * keep their value; a new rule starts with both off.
   */
  updateCategory(
    category: string,
    params: UpdateTrackingRuleParams,
    options?: ReadOptions,
  ): Promise<CossResult<TrackingRule>> {
    return this.#http.request<TrackingRule>({
      method: "PATCH",
      path: categoryPath(category),
      body: params,
      signal: options?.signal,
    });
  }

  /** Removes a category's rule: its emails follow the environment default again. */
  removeCategory(
    category: string,
    options?: ReadOptions,
  ): Promise<CossResult<DeletedTrackingRule>> {
    return this.#http.request<DeletedTrackingRule>({
      method: "DELETE",
      path: categoryPath(category),
      signal: options?.signal,
    });
  }
}
