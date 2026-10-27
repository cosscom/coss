# Sign (e-signatures): the documents bucket and the seal's signing key. Sign stays off in
# production until SIGN_DOCUMENTS_BUCKET is set (plain_env, api and worker) and the signing app is
# deployed; see packages/sign/AGENTS.md, "Going live".

# Encrypts every object of the bucket (documents, signatures, signed PDFs).
resource "aws_kms_key" "sign_documents" {
  description             = "${local.name}: Sign documents bucket"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "sign_documents" {
  name          = "alias/${local.name}-sign-documents"
  target_key_id = aws_kms_key.sign_documents.key_id
}

# Customers' signed records: kept until they delete them (no expiry), versioned so an accidental
# overwrite can be undone, never public.
resource "aws_s3_bucket" "sign_documents" {
  bucket = "${local.name}-sign-documents-${var.account_id}"
}

resource "aws_s3_bucket_ownership_controls" "sign_documents" {
  bucket = aws_s3_bucket.sign_documents.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "sign_documents" {
  bucket                  = aws_s3_bucket.sign_documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "sign_documents" {
  bucket = aws_s3_bucket.sign_documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sign_documents" {
  bucket = aws_s3_bucket.sign_documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.sign_documents.arn
    }
    bucket_key_enabled = true
  }
}

# Deleted objects (a deleted request, an organization's teardown) leave noncurrent versions: gone
# after 30 days.
resource "aws_s3_bucket_lifecycle_configuration" "sign_documents" {
  bucket = aws_s3_bucket.sign_documents.id
  rule {
    id     = "noncurrent"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# The seal: an asymmetric signing key whose certificate (from a CA on Adobe's trust list, CSR made
# from this key) is SIGN_SEAL_CERTIFICATE_CHAIN. Its id is SIGN_SEAL_KMS_KEY_ID (output).
resource "aws_kms_key" "sign_seal" {
  description              = "${local.name}: Sign seal (document signing)"
  customer_master_key_spec = "RSA_3072"
  key_usage                = "SIGN_VERIFY"
  deletion_window_in_days  = 30
}

resource "aws_kms_alias" "sign_seal" {
  name          = "alias/${local.name}-sign-seal"
  target_key_id = aws_kms_key.sign_seal.key_id
}

locals {
  sign_bucket_statement = {
    Effect   = "Allow"
    Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    Resource = ["${aws_s3_bucket.sign_documents.arn}/*"]
  }
  sign_key_statement = {
    Effect   = "Allow"
    Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
    Resource = [aws_kms_key.sign_documents.arn]
  }
}

# The API stores uploads and serves signed PDFs.
resource "aws_iam_role_policy" "task_sign_api" {
  name = "sign-documents"
  role = aws_iam_role.task["api"].id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [local.sign_bucket_statement, local.sign_key_statement]
  })
}

# The worker seals completed documents, emails copies, and deletes an organization's prefix.
resource "aws_iam_role_policy" "task_sign_worker" {
  name = "sign-documents"
  role = aws_iam_role.task["worker"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.sign_bucket_statement,
      local.sign_key_statement,
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [aws_s3_bucket.sign_documents.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Sign", "kms:GetPublicKey"]
        Resource = [aws_kms_key.sign_seal.arn]
      },
    ]
  })
}

output "sign_documents_bucket" {
  description = "SIGN_DOCUMENTS_BUCKET (api, worker, and the signing app once deployed)."
  value       = aws_s3_bucket.sign_documents.bucket
}

output "sign_seal_kms_key_id" {
  description = "SIGN_SEAL_KMS_KEY_ID (worker): make the seal certificate's CSR from this key."
  value       = aws_kms_key.sign_seal.key_id
}
