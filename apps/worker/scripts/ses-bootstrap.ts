/**
 * Creates (or updates) the shared AWS infrastructure for `EMAIL_PROVIDER=ses`, idempotently:
 *
 *   SES configuration set ──events──▶ SNS topic ──raw──▶ SQS queue (+ dead-letter queue) ◀── worker
 *   EventBridge rule (tenant sending status) ─────────────▶ same queue
 *
 * plus least-privilege IAM policies for the api, dashboard and worker (`<name>-api`, …, under the
 * `/coss/` path) and, with `--alert-email`, CloudWatch alarms on the queues sent to that address.
 * Tenants, domain identities and their associations are created by the app at runtime. COSS keeps
 * its own suppression lists, so SES suppression is turned off for the configuration set and for
 * every existing tenant of this stage, after importing existing suppressions into DATABASE_URL.
 * On upgrades, pause sends/domain changes and drain events before running (see README).
 *
 *   AWS_REGION=eu-west-1 bun run ses:bootstrap [--name coss] [--tenant-prefix coss] [--alert-email ops@…]
 *
 * Needs credentials allowed to manage SES, SNS, SQS and EventBridge (the default AWS credential
 * chain: env vars, profile or role). Prints the env vars the apps need. Use one AWS account (or at
 * least one region) per deployment stage: SES identities are account-wide.
 */

import { parseArgs } from "node:util";
import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  type PutMetricAlarmCommandInput,
} from "@aws-sdk/client-cloudwatch";
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand } from "@aws-sdk/client-eventbridge";
import {
  CreatePolicyCommand,
  CreatePolicyVersionCommand,
  DeletePolicyVersionCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand,
  IAMClient,
  ListPolicyVersionsCommand,
} from "@aws-sdk/client-iam";
import {
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
  type EventDestinationDefinition,
  PutConfigurationSetReputationOptionsCommand,
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
import { closeDb } from "@coss/db";
import { SES_TENANT_PREFIX_PATTERN } from "@coss/email/env";
import { cossPolicies, type PolicyDocument } from "./ses-policies.ts";
import { migrateSesSuppressions } from "./ses-suppression-migration.ts";

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
    "alert-email": { type: "string" },
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
const iam = new IAMClient({ region });
const cloudwatch = new CloudWatchClient({ region });

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

// 6. Commit historical protection to COSS before disabling any SES lists.
let tenantsUpdated: number;
try {
  tenantsUpdated = await migrateSesSuppressions(ses, { configurationSet: name, tenantPrefix });
} finally {
  await closeDb();
}
step(`SES suppression off (configuration set and ${tenantsUpdated} existing tenants)`);

// 7. Least-privilege IAM policies. A changed document becomes the new default version (IAM keeps
//    at most 5, so the oldest non-default one is dropped first).
const POLICY_PATH = "/coss/";
async function ensurePolicy(policyName: string, document: PolicyDocument): Promise<string> {
  const arn = `arn:aws:iam::${account}:policy${POLICY_PATH}${policyName}`;
  const json = JSON.stringify(document);
  let defaultVersion: string | undefined;
  try {
    defaultVersion = (await iam.send(new GetPolicyCommand({ PolicyArn: arn }))).Policy
      ?.DefaultVersionId;
  } catch (error) {
    if (!isNamed(error, "NoSuchEntityException", "NoSuchEntity")) throw error;
    await iam.send(
      new CreatePolicyCommand({
        PolicyName: policyName,
        Path: POLICY_PATH,
        PolicyDocument: json,
        Description: "COSS email (SES) least-privilege access, managed by ses:bootstrap",
      }),
    );
    return `${arn} (created)`;
  }
  const { PolicyVersion } = await iam.send(
    new GetPolicyVersionCommand({ PolicyArn: arn, VersionId: defaultVersion }),
  );
  const current = JSON.parse(decodeURIComponent(PolicyVersion?.Document ?? "{}"));
  if (JSON.stringify(current) === json) return `${arn} (unchanged)`;
  const { Versions = [] } = await iam.send(new ListPolicyVersionsCommand({ PolicyArn: arn }));
  if (Versions.length >= 5) {
    const oldest = Versions.filter((v) => !v.IsDefaultVersion).sort(
      (a, b) => (a.CreateDate?.getTime() ?? 0) - (b.CreateDate?.getTime() ?? 0),
    )[0];
    if (oldest?.VersionId) {
      await iam.send(
        new DeletePolicyVersionCommand({ PolicyArn: arn, VersionId: oldest.VersionId }),
      );
    }
  }
  await iam.send(
    new CreatePolicyVersionCommand({ PolicyArn: arn, PolicyDocument: json, SetAsDefault: true }),
  );
  return `${arn} (updated)`;
}
const policies = cossPolicies({ region, account, name, tenantPrefix, queueArn: queue.arn });
for (const [app, document] of Object.entries(policies)) {
  step(`IAM policy for the ${app}: ${await ensurePolicy(`${name}-${app}`, document)}`);
}

// 8. Alarms: anything in the dead-letter queue is a delivery event that was never recorded, and an
//    old message in the main queue means the worker isn't consuming.
const alertEmail = values["alert-email"];
if (alertEmail) {
  const { TopicArn: alertsArn } = await sns.send(
    new CreateTopicCommand({ Name: `${name}-alerts` }),
  );
  if (!alertsArn) throw new Error("CreateTopic returned no ARN.");
  // Idempotent for the same address; AWS emails a confirmation link until it is confirmed.
  await sns.send(
    new SubscribeCommand({
      TopicArn: alertsArn,
      Protocol: "email",
      Endpoint: alertEmail,
      ReturnSubscriptionArn: true,
    }),
  );
  const alarm = (
    input: Omit<PutMetricAlarmCommandInput, "Namespace" | "AlarmActions" | "OKActions">,
  ) =>
    cloudwatch.send(
      new PutMetricAlarmCommand({
        Namespace: "AWS/SQS",
        AlarmActions: [alertsArn],
        OKActions: [alertsArn],
        TreatMissingData: "notBreaching",
        ...input,
      }),
    );
  await alarm({
    AlarmName: `${name}-events-dead-letters`,
    AlarmDescription:
      "COSS: SES delivery events failed to be recorded 5 times and were dead-lettered. Inspect " +
      `${name}-events-dlq, fix the cause, then redrive the messages to ${name}-events.`,
    MetricName: "ApproximateNumberOfMessagesVisible",
    Dimensions: [{ Name: "QueueName", Value: `${name}-events-dlq` }],
    Statistic: "Maximum",
    Period: 300,
    EvaluationPeriods: 1,
    Threshold: 0,
    ComparisonOperator: "GreaterThanThreshold",
  });
  await alarm({
    AlarmName: `${name}-events-backlog`,
    AlarmDescription:
      `COSS: the oldest SES event in ${name}-events is over 15 minutes old; the worker is not ` +
      "consuming (down, or missing SQS permissions). Recipient statuses and webhooks are stale.",
    MetricName: "ApproximateAgeOfOldestMessage",
    Dimensions: [{ Name: "QueueName", Value: `${name}-events` }],
    Statistic: "Maximum",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 900,
    ComparisonOperator: "GreaterThanThreshold",
  });
  step(`Alarms ${name}-events-dead-letters, ${name}-events-backlog → ${alertEmail}`);
}

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
    `Attach the IAM policies under ${POLICY_PATH}: ${name}-api, ${name}-dashboard, ${name}-worker.`,
    alertEmail
      ? `Confirm the alert subscription from the email AWS sent to ${alertEmail}.`
      : "Pass --alert-email to get alarms when SES events fail or the worker stops consuming.",
    "New AWS accounts start in the SES sandbox: request production access in the SES console.",
  ].join("\n"),
);
