/**
 * Least-privilege IAM policies for the apps when `EMAIL_PROVIDER=ses`, created by `ses:bootstrap`
 * as customer-managed policies to attach to whatever identity each app runs as.
 *
 * Identities COSS creates are tagged `coss_managed=<tenant prefix>`; destructive identity operations
 * are only allowed on identities with that tag, so domains managed outside COSS in the same account
 * (e.g. the company's own) can't be changed or deleted by the apps. Sending can't be limited by tag:
 * SES authorizes `SendEmail` against the sender *address* (`identity/hello@acme.com`), which is not
 * a tagged resource. Sends are confined by the configuration set instead, and the app always sends
 * with a `<prefix>-…` tenant, which SES only allows with identities associated with that tenant.
 */
import { MANAGED_TAG } from "@coss/email/ses";

export type PolicyContext = {
  region: string;
  account: string;
  /** The configuration set (and resource name prefix), e.g. `coss`. */
  name: string;
  tenantPrefix: string;
  queueArn: string;
};

export type PolicyDocument = {
  Version: "2012-10-17";
  Statement: {
    Sid: string;
    Effect: "Allow";
    Action: string[];
    Resource: string[];
    Condition?: Record<string, Record<string, string>>;
  }[];
};

export function cossPolicies(
  ctx: PolicyContext,
): Record<"api" | "dashboard" | "worker", PolicyDocument> {
  const ses = `arn:aws:ses:${ctx.region}:${ctx.account}`;
  const identities = `${ses}:identity/*`;
  const tenants = `${ses}:tenant/${ctx.tenantPrefix}-*`;
  const configurationSet = `${ses}:configuration-set/${ctx.name}`;
  const managed = { StringEquals: { [`aws:ResourceTag/${MANAGED_TAG}`]: ctx.tenantPrefix } };
  const tagsNewIdentities = {
    StringEquals: { [`aws:RequestTag/${MANAGED_TAG}`]: ctx.tenantPrefix },
  };

  return {
    api: {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "SendFromIdentities",
          Effect: "Allow",
          Action: ["ses:SendEmail"],
          Resource: [identities],
        },
        {
          Sid: "SendWithCossConfigurationSet",
          Effect: "Allow",
          Action: ["ses:SendEmail"],
          Resource: [configurationSet],
        },
      ],
    },
    dashboard: {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ManageCossTenants",
          Effect: "Allow",
          Action: ["ses:CreateTenant", "ses:GetTenant", "ses:TagResource"],
          Resource: [tenants],
        },
        {
          Sid: "AssociateTenantResources",
          Effect: "Allow",
          Action: ["ses:CreateTenantResourceAssociation", "ses:DeleteTenantResourceAssociation"],
          Resource: [tenants, identities, configurationSet],
        },
        {
          Sid: "InspectIdentities",
          Effect: "Allow",
          Action: ["ses:GetEmailIdentity", "ses:ListResourceTenants", "ses:ListTagsForResource"],
          Resource: [identities],
        },
        {
          Sid: "CreateTaggedIdentities",
          Effect: "Allow",
          Action: ["ses:CreateEmailIdentity", "ses:TagResource"],
          Resource: [identities],
          Condition: tagsNewIdentities,
        },
        {
          Sid: "ChangeCossIdentities",
          Effect: "Allow",
          Action: ["ses:DeleteEmailIdentity", "ses:PutEmailIdentityMailFromAttributes"],
          Resource: [identities],
          Condition: managed,
        },
      ],
    },
    worker: {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ConsumeSesEvents",
          Effect: "Allow",
          Action: ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
          Resource: [ctx.queueArn],
        },
        {
          Sid: "InspectIdentities",
          Effect: "Allow",
          Action: ["ses:GetEmailIdentity", "ses:ListTagsForResource"],
          Resource: [identities],
        },
        {
          Sid: "ReleaseFailedDomains",
          Effect: "Allow",
          Action: ["ses:DeleteTenantResourceAssociation"],
          Resource: [tenants, identities],
        },
        {
          Sid: "DeleteCossIdentities",
          Effect: "Allow",
          Action: ["ses:DeleteEmailIdentity"],
          Resource: [identities],
          Condition: managed,
        },
        {
          Sid: "ReadCossTenants",
          Effect: "Allow",
          Action: ["ses:GetTenant"],
          Resource: [tenants],
        },
      ],
    },
  };
}
