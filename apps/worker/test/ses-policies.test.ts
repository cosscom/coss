import { describe, expect, test } from "bun:test";
import { cossPolicies } from "../scripts/ses-policies.ts";

const policies = cossPolicies({
  region: "us-east-2",
  account: "123456789012",
  name: "coss",
  tenantPrefix: "coss",
  queueArn: "arn:aws:sqs:us-east-2:123456789012:coss-events",
});

const statements = Object.values(policies).flatMap((policy) => policy.Statement);

describe("cossPolicies", () => {
  test("never grant wildcard actions or account-wide resources", () => {
    for (const statement of statements) {
      expect(statement.Action.every((action) => !action.includes("*"))).toBe(true);
      expect(statement.Resource).not.toContain("*");
      for (const resource of statement.Resource) {
        expect(resource).toMatch(/^arn:aws:(ses|sqs):us-east-2:123456789012:/);
      }
    }
  });

  test("the api can only send, with the COSS configuration set", () => {
    // SES authorizes sends against the sender address, which carries no tags (verified live).
    expect(policies.api.Statement).toEqual([
      expect.objectContaining({
        Action: ["ses:SendEmail"],
        Resource: ["arn:aws:ses:us-east-2:123456789012:identity/*"],
      }),
      expect.objectContaining({
        Action: ["ses:SendEmail"],
        Resource: ["arn:aws:ses:us-east-2:123456789012:configuration-set/coss"],
      }),
    ]);
  });

  test("identity changes require the coss_managed tag; tenants are limited to the prefix", () => {
    const destructive = ["ses:DeleteEmailIdentity", "ses:PutEmailIdentityMailFromAttributes"];
    for (const statement of statements) {
      if (statement.Action.some((action) => destructive.includes(action))) {
        expect(statement.Condition).toEqual({
          StringEquals: { "aws:ResourceTag/coss_managed": "coss" },
        });
      }
      if (statement.Action.includes("ses:CreateEmailIdentity")) {
        expect(statement.Condition).toEqual({
          StringEquals: { "aws:RequestTag/coss_managed": "coss" },
        });
      }
      for (const resource of statement.Resource.filter((r) => r.includes(":tenant/"))) {
        expect(resource).toEndWith(":tenant/coss-*");
      }
    }
  });

  test("the worker reads only the events queue and cannot send or create", () => {
    const actions = policies.worker.Statement.flatMap((statement) => statement.Action);
    expect(actions).not.toContain("ses:SendEmail");
    expect(actions).not.toContain("ses:CreateEmailIdentity");
    expect(policies.worker.Statement[0]).toMatchObject({
      Action: ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
      Resource: ["arn:aws:sqs:us-east-2:123456789012:coss-events"],
    });
  });
});
