resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = [for subnet in aws_subnet.private : subnet.id]
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name}-postgres18"
  family = "postgres18"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  # Logs statements slower than 1 s (no parameters: they can hold customer data).
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
}

# Pool budget (README, "Deploying to AWS"): (web + api + worker max tasks) × DATABASE_POOL_MAX +
# api tasks + 5 × worker tasks ≈ (6 + 6 + 2) × 10 + 6 + 10 = 156, well under db.t4g.medium's ~410.
resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class
  multi_az       = true

  db_name                               = "coss"
  username                              = "coss"
  password_wo                           = var.db_password
  password_wo_version                   = var.db_password_version
  ca_cert_identifier                    = "rds-ca-rsa2048-g1"
  parameter_group_name                  = aws_db_parameter_group.main.name
  db_subnet_group_name                  = aws_db_subnet_group.main.name
  vpc_security_group_ids                = [aws_security_group.db.id]
  publicly_accessible                   = false
  allocated_storage                     = 50
  max_allocated_storage                 = 500
  storage_type                          = "gp3"
  storage_encrypted                     = true
  backup_retention_period               = 14
  backup_window                         = "07:00-08:00"
  maintenance_window                    = "sun:08:30-sun:09:30"
  copy_tags_to_snapshot                 = true
  deletion_protection                   = true
  skip_final_snapshot                   = false
  final_snapshot_identifier             = "${local.name}-final"
  auto_minor_version_upgrade            = true
  allow_major_version_upgrade           = false
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql"]
}
