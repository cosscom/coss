import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type {
  DmarcReport,
  DmarcReportSummary,
  DomainDmarc,
  ListDmarcReportsParams,
} from "../types/dmarc.ts";
import type { List } from "../types/email.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const dmarcPath = (domainId: string) => `/v1/domains/${encodeURIComponent(domainId)}/dmarc`;

/** `coss.domains.dmarc.reports`: the aggregate reports received about a domain. */
export class DmarcReportsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().domains.dmarc.reports`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists the domain's reports, newest first, without their rows. */
  list(
    domainId: string,
    params: ListDmarcReportsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<DmarcReportSummary>>> {
    return this.#http.request<List<DmarcReportSummary>>({
      method: "GET",
      path: `${dmarcPath(domainId)}/reports`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one report with its rows. */
  get(domainId: string, reportId: string, options?: ReadOptions): Promise<CossResult<DmarcReport>> {
    return this.#http.request<DmarcReport>({
      method: "GET",
      path: `${dmarcPath(domainId)}/reports/${encodeURIComponent(reportId)}`,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.domains.dmarc`: a domain's DMARC record, the guided path from `p=none` to `p=reject`, and
 * the aggregate reports mailbox providers send to its `report_address`.
 */
export class DmarcResource {
  readonly #http: HttpClient;
  /** The domain's aggregate reports. */
  readonly reports: DmarcReportsResource;

  /** @internal Use `new Coss().domains.dmarc`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.reports = new DmarcReportsResource(http);
  }

  /**
   * The domain's DMARC status: its published record, the record to publish next and whether
   * the last 14 days of reports say that is safe (`ready`), and a summary of those reports.
   */
  get(domainId: string, options?: ReadOptions): Promise<CossResult<DomainDmarc>> {
    return this.#http.request<DomainDmarc>({
      method: "GET",
      path: dmarcPath(domainId),
      signal: options?.signal,
    });
  }
}
