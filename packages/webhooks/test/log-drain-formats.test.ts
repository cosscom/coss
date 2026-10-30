import { describe, expect, test } from "bun:test";
import {
  encodeLogDrainBatch,
  LOG_DRAIN_CONTENT_TYPES,
  otlpValue,
} from "../src/log-drain-formats.ts";
import {
  CreateLogDrainRequest,
  LOG_DRAIN_FORMATS,
  logDrainAuthHeaderNameProblem,
  UpdateLogDrainRequest,
} from "../src/log-drain-schemas.ts";

const context = { drainId: "drain_01k7c8m4q2f3e9v6t5r1n0p8yz", environmentId: "env_1" };
const now = new Date("2026-01-15T10:00:00.000Z");

const LOG = {
  object: "log",
  id: "log_1",
  occurred_at: "2026-01-15T09:30:00.123Z",
  source: "api",
  level: "info",
  type: "api.request",
  message: "POST /v1/emails 202",
  status_code: 202,
  duration_ms: 48.5,
  error_code: null,
  attributes: { request: { body: { to: ["a@example.com"], track: true } } },
};
const ERROR = {
  ...LOG,
  id: "log_2",
  occurred_at: "2026-01-15T09:30:01.000Z",
  source: "email",
  level: "error",
  type: "email.bounced",
  message: "Bounced: a@example.com",
};
const AUDIT = {
  object: "audit_event",
  id: "oaudit_1",
  created_at: "2026-01-15T09:30:02.000Z",
  actor_type: "api_key",
  actor_label: "key_1",
  action: "log_drain.created",
  target_type: "log_drain",
  target_id: "drain_1",
  target_label: "https://logs.example.com",
};
const LINES = [LOG, ERROR, AUDIT];

describe("log drain formats", () => {
  test("ndjson: one object per line, byte for byte", () => {
    const { body, contentType } = encodeLogDrainBatch("ndjson", LINES, context, now);
    expect(contentType).toBe("application/x-ndjson");
    expect(body).toBe(LINES.map((line) => `${JSON.stringify(line)}\n`).join(""));
  });

  test("loki: a stream per source and level, nanosecond timestamps, whole lines", () => {
    const { body, contentType } = encodeLogDrainBatch(
      "loki",
      [LOG, ERROR, AUDIT, LOG],
      context,
      now,
    );
    expect(contentType).toBe("application/json");
    const { streams } = JSON.parse(body) as {
      streams: { stream: Record<string, string>; values: [string, string][] }[];
    };
    expect(streams.map((stream) => stream.stream)).toEqual([
      { service_name: "coss", environment_id: "env_1", source: "api", level: "info" },
      { service_name: "coss", environment_id: "env_1", source: "email", level: "error" },
      { service_name: "coss", environment_id: "env_1", source: "audit", level: "info" },
    ]);
    expect(streams[0]?.values).toEqual([
      ["1768469400123000000", JSON.stringify(LOG)],
      ["1768469400123000000", JSON.stringify(LOG)],
    ]);
    expect(streams[2]?.values).toEqual([["1768469402000000000", JSON.stringify(AUDIT)]]);
  });

  test("datadog: one log per line, the object under `coss`", () => {
    const { body } = encodeLogDrainBatch("datadog", LINES, context, now);
    const logs = JSON.parse(body) as Record<string, unknown>[];
    expect(logs).toEqual([
      {
        ddsource: "coss",
        service: "coss",
        ddtags: "source:api,environment_id:env_1",
        status: "info",
        message: "POST /v1/emails 202",
        timestamp: Date.parse(LOG.occurred_at),
        coss: LOG,
      },
      expect.objectContaining({ status: "error", ddtags: "source:email,environment_id:env_1" }),
      expect.objectContaining({
        status: "info",
        message: "key_1 log_drain.created https://logs.example.com",
        timestamp: Date.parse(AUDIT.created_at),
        coss: AUDIT,
      }),
    ]);
  });

  test("otlp: one record per line with a structured body and severity", () => {
    const { body } = encodeLogDrainBatch("otlp", LINES, context, now);
    const parsed = JSON.parse(body);
    const [resourceLogs] = parsed.resourceLogs;
    expect(resourceLogs.resource.attributes).toEqual([
      { key: "service.name", value: { stringValue: "coss" } },
      { key: "coss.environment_id", value: { stringValue: "env_1" } },
      { key: "coss.log_drain_id", value: { stringValue: context.drainId } },
    ]);
    const records = resourceLogs.scopeLogs[0].logRecords;
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      timeUnixNano: "1768469400123000000",
      observedTimeUnixNano: "1768471200000000000",
      severityNumber: 9,
      severityText: "INFO",
      attributes: [
        { key: "coss.source", value: { stringValue: "api" } },
        { key: "coss.id", value: { stringValue: "log_1" } },
      ],
    });
    expect(records[1]).toMatchObject({ severityNumber: 17, severityText: "ERROR" });
    expect(records[0].body).toEqual(otlpValue(LOG));
    // `null` fields are left out of the map.
    const keys = records[0].body.kvlistValue.values.map((kv: { key: string }) => kv.key);
    expect(keys).toContain("status_code");
    expect(keys).not.toContain("error_code");
  });

  test("otlpValue maps every JSON type", () => {
    expect(otlpValue("a")).toEqual({ stringValue: "a" });
    expect(otlpValue(true)).toEqual({ boolValue: true });
    expect(otlpValue(42)).toEqual({ intValue: "42" });
    expect(otlpValue(1.5)).toEqual({ doubleValue: 1.5 });
    expect(otlpValue(null)).toEqual({});
    expect(otlpValue([1, null])).toEqual({ arrayValue: { values: [{ intValue: "1" }, {}] } });
    expect(otlpValue({ a: { b: "c" } })).toEqual({
      kvlistValue: {
        values: [
          {
            key: "a",
            value: { kvlistValue: { values: [{ key: "b", value: { stringValue: "c" } }] } },
          },
        ],
      },
    });
  });

  test("a line without a usable time takes the attempt's", () => {
    const { body } = encodeLogDrainBatch(
      "loki",
      [{ object: "log", occurred_at: "?" }],
      context,
      now,
    );
    expect(JSON.parse(body).streams[0].values[0][0]).toBe(`${now.getTime()}000000`);
  });

  test("every format has a content type", () => {
    for (const format of LOG_DRAIN_FORMATS) expect(LOG_DRAIN_CONTENT_TYPES[format]).toBeString();
  });
});

describe("log drain auth headers", () => {
  test("refuse names coss.com sets and names that aren't HTTP tokens", () => {
    for (const name of ["Authorization", "DD-API-KEY", "x-honeycomb-team", "X-Scope-OrgID"]) {
      expect(logDrainAuthHeaderNameProblem(name)).toBeNull();
    }
    for (const name of [
      "Content-Type",
      "user-agent",
      "Host",
      "webhook-signature",
      "Coss-Log-Drain-Id",
      "Transfer-Encoding",
      "Bad Header",
      "x:y",
      "naïve",
    ]) {
      expect(logDrainAuthHeaderNameProblem(name)).toBeString();
    }
  });

  test("are validated by the API's request schemas", () => {
    const base = { url: "https://logs.example.com" };
    expect(
      CreateLogDrainRequest.safeParse({
        ...base,
        format: "datadog",
        auth_header: { name: "DD-API-KEY", value: " key " },
      }).data?.auth_header,
    ).toEqual({ name: "DD-API-KEY", value: "key" });
    expect(
      CreateLogDrainRequest.safeParse({ ...base, auth_header: { name: "Host", value: "x" } })
        .success,
    ).toBe(false);
    expect(
      CreateLogDrainRequest.safeParse({
        ...base,
        auth_header: { name: "Authorization", value: "Bearer a\r\nX-Evil: 1" },
      }).success,
    ).toBe(false);
    expect(CreateLogDrainRequest.safeParse({ ...base, format: "syslog" }).success).toBe(false);
    // `null` removes the header, which counts as a change.
    expect(UpdateLogDrainRequest.safeParse({ auth_header: null }).success).toBe(true);
  });
});
