# Forms: the bucket of files people upload with submissions, FORMS_FILES_BUCKET (plain_env: web,
# api and worker); see packages/forms/AGENTS.md, "Production".

# Encrypts every uploaded file.
resource "aws_kms_key" "forms_files" {
  description             = "${local.name}: Forms files bucket"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "forms_files" {
  name          = "alias/${local.name}-forms-files"
  target_key_id = aws_kms_key.forms_files.key_id
}

# Files strangers uploaded: never public, never versioned (a deleted file is gone), and expired
# a day after the longest submission retention (RETENTION_DAYS.formSubmissions, 90 days) in case
# a deletion never reached the bucket.
resource "aws_s3_bucket" "forms_files" {
  bucket = "${local.name}-forms-files-${var.account_id}"
}

resource "aws_s3_bucket_ownership_controls" "forms_files" {
  bucket = aws_s3_bucket.forms_files.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "forms_files" {
  bucket                  = aws_s3_bucket.forms_files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "forms_files" {
  bucket = aws_s3_bucket.forms_files.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.forms_files.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "forms_files" {
  bucket = aws_s3_bucket.forms_files.id
  rule {
    id     = "retention"
    status = "Enabled"
    filter {}
    expiration {
      days = 91
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

locals {
  forms_bucket_statement = {
    Effect   = "Allow"
    Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    Resource = ["${aws_s3_bucket.forms_files.arn}/*"]
  }
  forms_key_statement = {
    Effect   = "Allow"
    Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
    Resource = [aws_kms_key.forms_files.arn]
  }
}

# The API stores uploads and serves them to API keys.
resource "aws_iam_role_policy" "task_forms_api" {
  name = "forms-files"
  role = aws_iam_role.task["api"].id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [local.forms_bucket_statement, local.forms_key_statement]
  })
}

# The dashboard downloads files and deletes submissions' and forms' files.
resource "aws_iam_role_policy" "task_forms_web" {
  name = "forms-files"
  role = aws_iam_role.task["web"].id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [local.forms_bucket_statement, local.forms_key_statement]
  })
}

# The worker retries deletions and deletes an organization's prefix.
resource "aws_iam_role_policy" "task_forms_worker" {
  name = "forms-files"
  role = aws_iam_role.task["worker"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.forms_bucket_statement,
      local.forms_key_statement,
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [aws_s3_bucket.forms_files.arn]
      },
    ]
  })
}

output "forms_files_bucket" {
  description = "FORMS_FILES_BUCKET (web, api and worker)."
  value       = aws_s3_bucket.forms_files.bucket
}
