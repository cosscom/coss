/**
 * The SES v2 operations COSS uses, as a narrow port over `SESv2Client` (tests use a fake).
 * The client never retries on its own: `SendEmail` is not idempotent, so a retry after a timeout
 * could send twice. Callers retry only when SES certainly rejected the request (throttling).
 */
import {
  CreateEmailIdentityCommand,
  type CreateEmailIdentityCommandInput,
  type CreateEmailIdentityCommandOutput,
  CreateTenantCommand,
  type CreateTenantCommandInput,
  type CreateTenantCommandOutput,
  CreateTenantResourceAssociationCommand,
  type CreateTenantResourceAssociationCommandInput,
  DeleteEmailIdentityCommand,
  DeleteTenantResourceAssociationCommand,
  type DeleteTenantResourceAssociationCommandInput,
  GetEmailIdentityCommand,
  type GetEmailIdentityCommandOutput,
  GetTenantCommand,
  type GetTenantCommandOutput,
  ListResourceTenantsCommand,
  type ListResourceTenantsCommandOutput,
  ListTagsForResourceCommand,
  type ListTagsForResourceCommandOutput,
  PutEmailIdentityMailFromAttributesCommand,
  type PutEmailIdentityMailFromAttributesCommandInput,
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SendEmailCommandOutput,
} from "@aws-sdk/client-sesv2";

export type SesConfig = {
  region: string;
  /** The shared configuration set (event publishing), created by `ses:bootstrap`. */
  configurationSet: string;
  /** Prefixes tenant names, `<prefix>-<organization id>`; separates stages in one account. */
  tenantPrefix: string;
};

export interface SesApi {
  sendEmail(input: SendEmailCommandInput): Promise<SendEmailCommandOutput>;
  createTenant(input: CreateTenantCommandInput): Promise<CreateTenantCommandOutput>;
  getTenant(input: { TenantName: string }): Promise<GetTenantCommandOutput>;
  createTenantResourceAssociation(
    input: CreateTenantResourceAssociationCommandInput,
  ): Promise<unknown>;
  deleteTenantResourceAssociation(
    input: DeleteTenantResourceAssociationCommandInput,
  ): Promise<unknown>;
  listResourceTenants(input: { ResourceArn: string }): Promise<ListResourceTenantsCommandOutput>;
  listTagsForResource(input: { ResourceArn: string }): Promise<ListTagsForResourceCommandOutput>;
  createEmailIdentity(
    input: CreateEmailIdentityCommandInput,
  ): Promise<CreateEmailIdentityCommandOutput>;
  getEmailIdentity(input: { EmailIdentity: string }): Promise<GetEmailIdentityCommandOutput>;
  deleteEmailIdentity(input: { EmailIdentity: string }): Promise<unknown>;
  putEmailIdentityMailFromAttributes(
    input: PutEmailIdentityMailFromAttributesCommandInput,
  ): Promise<unknown>;
}

export function createSesApi(region: string): SesApi {
  const client = new SESv2Client({
    region,
    maxAttempts: 1,
    requestHandler: { requestTimeout: 15_000, connectionTimeout: 5_000 },
  });
  return {
    sendEmail: (input) => client.send(new SendEmailCommand(input)),
    createTenant: (input) => client.send(new CreateTenantCommand(input)),
    getTenant: (input) => client.send(new GetTenantCommand(input)),
    createTenantResourceAssociation: (input) =>
      client.send(new CreateTenantResourceAssociationCommand(input)),
    deleteTenantResourceAssociation: (input) =>
      client.send(new DeleteTenantResourceAssociationCommand(input)),
    listResourceTenants: (input) => client.send(new ListResourceTenantsCommand(input)),
    listTagsForResource: (input) => client.send(new ListTagsForResourceCommand(input)),
    createEmailIdentity: (input) => client.send(new CreateEmailIdentityCommand(input)),
    getEmailIdentity: (input) => client.send(new GetEmailIdentityCommand(input)),
    deleteEmailIdentity: (input) => client.send(new DeleteEmailIdentityCommand(input)),
    putEmailIdentityMailFromAttributes: (input) =>
      client.send(new PutEmailIdentityMailFromAttributesCommand(input)),
  };
}

/** True when `error` is the named SES exception (by name, robust to duplicate SDK copies). */
export function isSesError(error: unknown, name: string): boolean {
  return (error as { name?: string } | null)?.name === name;
}

/** `<prefix>-<organization id>`: at most 64 characters of [A-Za-z0-9_-]. */
export function tenantNameFor(prefix: string, organizationId: string): string {
  return `${prefix}-${organizationId}`;
}

/** The account id from any SES ARN (`arn:aws:ses:<region>:<account>:…`). */
export function accountOf(arn: string): string {
  const account = arn.split(":")[4];
  if (!account) throw new Error(`Not an ARN: ${arn}`);
  return account;
}
