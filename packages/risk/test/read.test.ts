import { describe, expect, test } from "bun:test";
import { listRiskAssessmentsForEmail } from "../src/read.ts";
import { setup } from "./helpers.ts";

describe("listRiskAssessmentsForEmail", () => {
  test("finds an environment's assessments of one address, newest first", async () => {
    const { assess, live, sandbox } = await setup();
    const signup = (await assess({ event: "signup", user: { email: "Ada@acme.io" } })).assessment;
    const login = (await assess({ event: "login", user: { id: "u1", email: "ada@acme.io" } }))
      .assessment;
    await assess({ event: "signup", user: { email: "bob@acme.io" } });
    await assess({ event: "signup", user: { email: "ada@acme.io" } }, { env: sandbox });

    const scope = { organizationId: live.organizationId, environmentId: live.environmentId };
    expect((await listRiskAssessmentsForEmail(scope, "ADA@acme.io")).map((row) => row.id)).toEqual([
      login.id,
      signup.id,
    ]);
    expect(
      (await listRiskAssessmentsForEmail(scope, "ada@acme.io", { event: "signup" })).map(
        (row) => row.id,
      ),
    ).toEqual([signup.id]);
    expect(await listRiskAssessmentsForEmail(scope, "nobody@acme.io")).toEqual([]);
  });
});
