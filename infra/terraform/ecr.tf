resource "aws_ecr_repository" "service" {
  for_each = local.services
  name     = "coss/${each.key}"
  # Release tags (commits) never move; `buildcache` is the BuildKit layer cache, rewritten by
  # every build.
  image_tag_mutability = "IMMUTABLE_WITH_EXCLUSION"
  image_tag_mutability_exclusion_filter {
    filter      = "buildcache"
    filter_type = "WILDCARD"
  }
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "service" {
  for_each   = aws_ecr_repository.service
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 50 images (rollbacks)"
      selection    = { tagStatus = "tagged", tagPatternList = ["*"], countType = "imageCountMoreThan", countNumber = 50 }
      action       = { type = "expire" }
      }, {
      rulePriority = 2
      description  = "Drop untagged images (replaced build caches) after a week"
      selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 7 }
      action       = { type = "expire" }
    }]
  })
}

# The deployed commit: written by the deploy workflow after every rollout, read here so task
# definitions Terraform registers (env changes) keep the running image.
resource "aws_ssm_parameter" "image_tag" {
  name           = "/coss/${var.stage}/image-tag"
  type           = "String"
  insecure_value = var.initial_image_tag
  lifecycle {
    ignore_changes = [insecure_value]
  }
}
