/**
 * Creates (or updates) the shared AWS infrastructure for `EMAIL_PROVIDER=ses`, idempotently:
 *
 *   SES configuration set ──events──▶ SNS topic ──raw──▶ SQS queue (+ dead-letter queue) ◀── worker
 *   EventBridge rule (tenant sending status) ─────────────▶ same queue
 *
 * Tenants, domain identities and their associations are created by the app at runtime. COSS keeps
 * its own suppression lists, so SES suppression is turned off for the configuration set and for
 * every existing tenant of this stage.
 *
 *   AWS_REGION=eu-west-1 bun run ses:bootstrap [--name coss] [--tenant-prefix coss]
 *
 * Needs credentials allowed to manage SES, SNS, SQS and EventBridge (the default AWS credential
 * chain: env vars, profile or role). Prints the env vars the apps need. Use one AWS account (or at
 * least one region) per deployment stage: SES identities are account-wide.
 */

import { parseArgs } from "node:util";
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand } from "@aws-sdk/client-eventbridge";
import {
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
  type EventDestinationDefinition,
  ListTenantsCommand,
  PutConfigurationSetReputationOptionsCommand,
  PutConfigurationSetSuppressionOptionsCommand,
  PutTenantSuppressionAttributesCommand,
  SESv2Client,
  UpdateConfigurationSetEventDestinationCommand,
} from "@aws-sdk/client-sesv2";
import {
  CreateTopicCommand,
  SetTopicAttributesCommand,
  SNSClient,
  SubscribeCommand,
} from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  SetQueueAttributesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { SES_TENANT_PREFIX_PATTERN } from "@coss/email/env";
import { TENANT_SUPPRESSION, tenantNameFor } from "@coss/email/ses";

const EVENT_DESTINATION = "coss-events";
const EVENT_TYPES = [
  "SEND",
  "REJECT",
  "BOUNCE",
  "COMPLAINT",
  "DELIVERY",
  "DELIVERY_DELAY",
  "RENDERING_FAILURE",
] as const;
const DAY_SECONDS = 24 * 60 * 60;

const { values } = parseArgs({
  options: {
    name: { type: "string", default: process.env.SES_CONFIGURATION_SET ?? "coss" },
    "tenant-prefix": { type: "string", default: process.env.SES_TENANT_PREFIX ?? "coss" },
  },
});
const region = process.env.AWS_REGION;
const name = values.name;
const tenantPrefix = values["tenant-prefix"];
if (!region) throw new Error("Set AWS_REGION (e.g. AWS_REGION=eu-west-1).");
if (!/^[A-Za-z0-9_-]{1,48}$/.test(name)) throw new Error(`Invalid --name "${name}".`);
if (!SES_TENANT_PREFIX_PATTERN.test(tenantPrefix)) {
  throw new Error(`Invalid --tenant-prefix "${tenantPrefix}" (1-32 of A-Z a-z 0-9 _ -).`);
}

const ses = new SESv2Client({ region });
const sns = new SNSClient({ region });
const sqs = new SQSClient({ region });
const events = new EventBridgeClient({ region });

function step(message: string): void {
  console.info(`• ${message}`);
}

function isNamed(error: unknown, ...names: string[]): boolean {
  return names.includes((error as { name?: string }).name ?? "");
}

/** Returns the queue's URL and ARN, creating it if needed. */
async function ensureQueue(queueName: string): Promise<{ url: string; arn: string }> {
  let url: string | undefined;
  try {
    url = (await sqs.send(new GetQueueUrlCommand({ QueueName: queueName }))).QueueUrl;
  } catch (error) {
    if (!isNamed(error, "QueueDoesNotExist", "AWS.SimpleQueueService.NonExistentQueue"))
      throw error;
    url = (await sqs.send(new CreateQueueCommand({ QueueName: queueName }))).QueueUrl;
  }
  if (!url) throw new Error(`No URL for queue ${queueName}.`);
  const { Attributes } = await sqs.send(
    new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ["QueueArn"] }),
  );
  const arn = Attributes?.QueueArn;
  if (!arn) throw new Error(`No ARN for queue ${queueName}.`);
  return { url, arn };
}

// 1. SNS topic that SES publishes events to. Its ARN also tells us the account id.
const { TopicArn: topicArn } = await sns.send(
  new CreateTopicCommand({ Name: `${name}-ses-events` }),
);
if (!topicArn) throw new Error("CreateTopic returned no ARN.");
const account = topicArn.split(":")[4] ?? "";
const configurationSetArn = `arn:aws:ses:${region}:${account}:configuration-set/${name}`;
step(`SNS topic ${topicArn}`);
await sns.send(
  new SetTopicAttributesCommand({
    TopicArn: topicArn,
    AttributeName: "Policy",
    AttributeValue: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "SesPublishesEvents",
          Effect: "Allow",
          Principal: { Service: "ses.amazonaws.com" },
          Action: "sns:Publish",
          Resource: topicArn,
          Condition: {
            StringEquals: { "AWS:SourceAccount": account },
            ArnLike: { "AWS:SourceArn": configurationSetArn },
          },
        },
      ],
    }),
  }),
);

// 2. Queues. The worker reads the main queue; messages failing 5 times move to the DLQ.
const dlq = await ensureQueue(`${name}-events-dlq`);
const queue = await ensureQueue(`${name}-events`);
step(`SQS queue ${queue.url} (dead letters: ${dlq.url})`);

// 3. EventBridge rule: tenant sending status changes for this deployment's tenants only.
const { RuleArn: ruleArn } = await events.send(
  new PutRuleCommand({
    Name: `${name}-tenant-status`,
    Description: "COSS: SES tenant sending status changes",
    State: "ENABLED",
    EventPattern: JSON.stringify({
      source: ["aws.ses"],
      "detail-type": ["Sending Status Enabled", "Sending Status Disabled"],
      resources: [{ prefix: `arn:aws:ses:${region}:${account}:tenant/${tenantPrefix}-` }],
    }),
  }),
);
if (!ruleArn) throw new Error("PutRule returned no ARN.");
await events.send(
  new PutTargetsCommand({
    Rule: `${name}-tenant-status`,
    Targets: [{ Id: "coss-events-queue", Arn: queue.arn }],
  }),
);
step(`EventBridge rule ${ruleArn}`);

await sqs.send(
  new SetQueueAttributesCommand({
    QueueUrl: dlq.url,
    Attributes: {
      MessageRetentionPeriod: String(14 * DAY_SECONDS),
      SqsManagedSseEnabled: "true",
    },
  }),
);
await sqs.send(
  new SetQueueAttributesCommand({
    QueueUrl: queue.url,
    Attributes: {
      MessageRetentionPeriod: String(4 * DAY_SECONDS),
      VisibilityTimeout: "60",
      ReceiveMessageWaitTimeSeconds: "20",
      SqsManagedSseEnabled: "true",
      RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlq.arn, maxReceiveCount: 5 }),
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "SnsDeliversSesEvents",
            Effect: "Allow",
            Principal: { Service: "sns.amazonaws.com" },
            Action: "sqs:SendMessage",
            Resource: queue.arn,
            Condition: { ArnEquals: { "aws:SourceArn": topicArn } },
          },
          {
            Sid: "EventBridgeDeliversTenantStatus",
            Effect: "Allow",
            Principal: { Service: "events.amazonaws.com" },
            Action: "sqs:SendMessage",
            Resource: queue.arn,
            Condition: { ArnEquals: { "aws:SourceArn": ruleArn } },
          },
        ],
      }),
    },
  }),
);

// 4. Topic → queue, with raw delivery (the SQS body is the SES event itself). Idempotent.
await sns.send(
  new SubscribeCommand({
    TopicArn: topicArn,
    Protocol: "sqs",
    Endpoint: queue.arn,
    Attributes: { RawMessageDelivery: "true" },
    ReturnSubscriptionArn: true,
  }),
);
step("SNS → SQS subscription (raw message delivery)");

// 5. Configuration set with event publishing to the topic.
try {
  await ses.send(
    new CreateConfigurationSetCommand({
      ConfigurationSetName: name,
      ReputationOptions: { ReputationMetricsEnabled: true },
      SendingOptions: { SendingEnabled: true },
    }),
  );
} catch (error) {
  if (!isNamed(error, "AlreadyExistsException")) throw error;
  await ses.send(
    new PutConfigurationSetReputationOptionsCommand({
      ConfigurationSetName: name,
      ReputationMetricsEnabled: true,
    }),
  );
}
const destination: EventDestinationDefinition = {
  Enabled: true,
  MatchingEventTypes: [...EVENT_TYPES],
  SnsDestination: { TopicArn: topicArn },
};
try {
  await ses.send(
    new CreateConfigurationSetEventDestinationCommand({
      ConfigurationSetName: name,
      EventDestinationName: EVENT_DESTINATION,
      EventDestination: destination,
    }),
  );
} catch (error) {
  if (!isNamed(error, "AlreadyExistsException")) throw error;
  await ses.send(
    new UpdateConfigurationSetEventDestinationCommand({
      ConfigurationSetName: name,
      EventDestinationName: EVENT_DESTINATION,
      EventDestination: destination,
    }),
  );
}
step(`SES configuration set ${name} → ${EVENT_TYPES.join(", ")}`);

// 6. SES never suppresses on its own: COSS keeps the suppression lists (`email_suppression`).
// The configuration set overrides the account-level list; tenants get their own, empty, list.
await ses.send(
  new PutConfigurationSetSuppressionOptionsCommand({
    ConfigurationSetName: name,
    ...TENANT_SUPPRESSION,
  }),
);
const ownTenant = tenantNameFor(tenantPrefix, "");
let tenantsUpdated = 0;
let nextToken: string | undefined;
do {
  const page = await ses.send(new ListTenantsCommand({ NextToken: nextToken, PageSize: 100 }));
  for (const tenant of page.Tenants ?? []) {
    if (!tenant.TenantName?.startsWith(ownTenant)) continue;
    await ses.send(
      new PutTenantSuppressionAttributesCommand({
        TenantName: tenant.TenantName,
        ...TENANT_SUPPRESSION,
      }),
    );
    tenantsUpdated++;
  }
  nextToken = page.NextToken;
} while (nextToken);
step(`SES suppression off (configuration set and ${tenantsUpdated} existing tenants)`);

console.info(
  [
    "",
    "Done. Set these for the api, dashboard and worker:",
    "",
    "EMAIL_PROVIDER=ses",
    `AWS_REGION=${region}`,
    `SES_CONFIGURATION_SET=${name}`,
    `SES_TENANT_PREFIX=${tenantPrefix}`,
    `SES_EVENTS_QUEUE_URL=${queue.url}`,
    "",
    "New AWS accounts start in the SES sandbox: request production access in the SES console.",
  ].join("\n"),
);
