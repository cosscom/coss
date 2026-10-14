# The deploy workflow (.github/workflows/deploy.yml) runs on CodeBuild-hosted GitHub Actions
# runners: its jobs get AWS credentials from this project's role, so no AWS keys live in GitHub.
# (GitHub OIDC would be the usual way, but the organization's SCP forbids identity providers.)
# Only jobs of the workflow named `Deploy` in this repository start a runner (webhook filter);
# anyone who can push a workflow with that name to the repository can use it.

resource "aws_codeconnections_connection" "github" {
  name          = "${local.name}-github"
  provider_type = "GitHub"
  # Created PENDING: complete the handshake once in the console (Developer Tools → Connections).
}

resource "aws_codebuild_source_credential" "github" {
  auth_type   = "CODECONNECTIONS"
  server_type = "GITHUB"
  token       = aws_codeconnections_connection.github.arn
}

data "aws_iam_policy_document" "codebuild_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [var.account_id]
    }
  }
}

resource "aws_cloudwatch_log_group" "deploy" {
  name              = "/coss/${var.stage}/deploy"
  retention_in_days = var.log_retention_days
}

resource "aws_codebuild_project" "deploy" {
  name          = "${local.name}-deploy"
  description   = "GitHub Actions runners for ${var.github_repository}'s Deploy workflow"
  service_role  = aws_iam_role.deploy.arn
  build_timeout = 60

  source {
    type     = "GITHUB"
    location = "https://github.com/${var.github_repository}.git"
    auth {
      type     = "CODECONNECTIONS"
      resource = aws_codeconnections_connection.github.arn
    }
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    type            = "ARM_CONTAINER"
    compute_type    = "BUILD_GENERAL1_LARGE"
    image           = "aws/codebuild/amazonlinux-aarch64-standard:3.0"
    privileged_mode = true # docker builds
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.deploy.name
    }
  }

  # The service role uses the connection when the webhook is created.
  depends_on = [aws_codebuild_source_credential.github, aws_iam_role_policy.deploy_build]
}

resource "aws_codebuild_webhook" "deploy" {
  project_name = aws_codebuild_project.deploy.name
  build_type   = "BUILD"
  filter_group {
    filter {
      type    = "EVENT"
      pattern = "WORKFLOW_JOB_QUEUED"
    }
    filter {
      type    = "WORKFLOW_NAME"
      pattern = "^Deploy$"
    }
    # The repository is public: anyone can open a pull request with a workflow named "Deploy"
    # asking for this runner, whose role deploys production. Only the people allowed to push
    # (whose merges and dispatches run Deploy) get one.
    filter {
      type    = "ACTOR_ACCOUNT_ID"
      pattern = "^(${join("|", var.deploy_actor_ids)})$"
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${local.name}-deploy"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume.json
}

# Building and pushing images (needed before any service exists).
resource "aws_iam_role_policy" "deploy_build" {
  name = "build"
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "RunnerLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.deploy.arn}:*"
      },
      {
        Sid      = "GitHubConnection"
        Effect   = "Allow"
        Action   = ["codeconnections:GetConnectionToken", "codeconnections:GetConnection", "codeconnections:UseConnection"]
        Resource = aws_codeconnections_connection.github.arn
      },
      {
        Sid      = "EcrLogin"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeImages",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
        ]
        Resource = concat([for repository in aws_ecr_repository.service : repository.arn], [aws_ecr_repository.base_bun.arn])
      },
    ]
  })
}

# Migrations, rollouts, the CDN invalidation and the routing check.
resource "aws_iam_role_policy" "deploy" {
  name = "rollout"
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "TaskDefinitions"
        Effect   = "Allow"
        Action   = ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:TagResource"]
        Resource = "*"
      },
      {
        Sid      = "Services"
        Effect   = "Allow"
        Action   = ["ecs:DescribeServices", "ecs:UpdateService"]
        Resource = [for service in aws_ecs_service.service : service.id]
      },
      {
        Sid      = "Migrate"
        Effect   = "Allow"
        Action   = ["ecs:RunTask"]
        Resource = "arn:aws:ecs:${var.region}:${var.account_id}:task-definition/${local.name}-worker:*"
        Condition = {
          ArnEquals = { "ecs:cluster" = aws_ecs_cluster.main.arn }
        }
      },
      {
        # ecs-deploy.sh: how long the worker's new tasks have been running.
        Sid      = "ServiceTasks"
        Effect   = "Allow"
        Action   = ["ecs:ListTasks"]
        Resource = "*"
        Condition = {
          ArnEquals = { "ecs:cluster" = aws_ecs_cluster.main.arn }
        }
      },
      {
        Sid      = "MigrateStatus"
        Effect   = "Allow"
        Action   = ["ecs:DescribeTasks"]
        Resource = "arn:aws:ecs:${var.region}:${var.account_id}:task/${aws_ecs_cluster.main.name}/*"
      },
      {
        Sid      = "MigrateLogs"
        Effect   = "Allow"
        Action   = ["logs:GetLogEvents"]
        Resource = "${aws_cloudwatch_log_group.service["worker"].arn}:*"
      },
      {
        Sid      = "PassTaskRoles"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = concat([aws_iam_role.execution.arn], [for role in aws_iam_role.task : role.arn])
      },
      {
        Sid      = "ImageTag"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:PutParameter"]
        Resource = aws_ssm_parameter.image_tag.arn
      },
      {
        Sid      = "Invalidate"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation", "cloudfront:GetDistributionConfig"]
        Resource = aws_cloudfront_distribution.dashboard.arn
      },
      {
        # infra/scripts/check-routing.sh (read-only; these Describe actions have no resource level).
        Sid      = "RoutingCheck"
        Effect   = "Allow"
        Action   = ["elasticloadbalancing:DescribeLoadBalancers", "elasticloadbalancing:DescribeListeners", "elasticloadbalancing:DescribeRules"]
        Resource = "*"
      },
    ]
  })
}
