data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:ecs:${var.region}:${var.account_id}:*"]
    }
  }
}

# --- Execution role (shared): pull images, write logs, read the stage secret ------------------

resource "aws_iam_role" "execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secret" {
  name = "stage-secret"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.stage.arn]
    }]
  })
}

# --- Task roles ------------------------------------------------------------------------------

resource "aws_iam_role" "task" {
  for_each           = local.services
  name               = "${local.name}-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

# web → <ses_name>-dashboard, api → -api, worker → -worker: created by ses:bootstrap
# (apps/worker/scripts/ses-policies.ts). The site gets no permissions.
resource "aws_iam_role_policy_attachment" "task_ses" {
  for_each   = local.ses_policy_arns
  role       = aws_iam_role.task[each.key].name
  policy_arn = each.value
}

# ECS Exec (`aws ecs execute-command`) for operators.
resource "aws_iam_role_policy" "task_exec" {
  for_each = aws_iam_role.task
  name     = "ecs-exec"
  role     = each.value.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel",
      ]
      Resource = "*"
    }]
  })
}

# --- ses-bootstrap one-off task (`run-task` with this role as taskRoleArn override) -----------

resource "aws_iam_role" "bootstrap" {
  name               = "${local.name}-ses-bootstrap"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy" "bootstrap" {
  name = "ses-bootstrap"
  role = aws_iam_role.bootstrap.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SharedEmailResources"
        Effect   = "Allow"
        Action   = ["ses:*", "sns:*", "sqs:*", "events:*", "cloudwatch:PutMetricAlarm", "cloudwatch:DescribeAlarms"]
        Resource = "*"
      },
      {
        Sid    = "AppPolicies"
        Effect = "Allow"
        Action = [
          "iam:CreatePolicy",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListPolicyVersions",
        ]
        Resource = "arn:aws:iam::${var.account_id}:policy/coss/*"
      },
    ]
  })
}
