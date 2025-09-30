# AWS Backup Configuration for Disaster Recovery

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Name        = "${var.project_name}-backup-vault"
    Environment = var.environment
  }
}

# KMS Key for backup encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for ${var.project_name} backups"
  deletion_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-backup-kms-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.project_name}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-backup-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Backup Plan
resource "aws_backup_plan" "main" {
  name = "${var.project_name}-backup-plan"

  # Daily backups
  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)" # 5 AM UTC daily

    lifecycle {
      cold_storage_after = 30
      delete_after       = var.backup_retention_days
    }

    recovery_point_tags = {
      BackupType  = "Daily"
      Environment = var.environment
    }
  }

  # Weekly backups
  rule {
    rule_name         = "weekly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * SUN *)" # 5 AM UTC every Sunday

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365 # Keep weekly backups for 1 year
    }

    recovery_point_tags = {
      BackupType  = "Weekly"
      Environment = var.environment
    }
  }

  tags = {
    Name        = "${var.project_name}-backup-plan"
    Environment = var.environment
  }
}

# Backup Selection for RDS
resource "aws_backup_selection" "rds" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-rds-backup-selection"
  plan_id      = aws_backup_plan.main.id

  resources = [
    aws_db_instance.main.arn,
    aws_db_instance.replica.arn
  ]

  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# Backup Selection for EBS Volumes
resource "aws_backup_selection" "ebs" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-ebs-backup-selection"
  plan_id      = aws_backup_plan.main.id

  resources = ["arn:aws:ec2:*:*:volume/*"]

  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# S3 Cross-Region Replication for disaster recovery
resource "aws_s3_bucket" "backup_replica" {
  bucket   = "${var.project_name}-backup-replica-${random_id.backup_replica_suffix.hex}"
  provider = aws.backup_region

  tags = {
    Name        = "${var.project_name}-backup-replica"
    Environment = var.environment
  }
}

resource "random_id" "backup_replica_suffix" {
  byte_length = 4
}

# S3 Bucket versioning for backup replica
resource "aws_s3_bucket_versioning" "backup_replica" {
  bucket   = aws_s3_bucket.backup_replica.id
  provider = aws.backup_region
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption for backup replica
resource "aws_s3_bucket_server_side_encryption_configuration" "backup_replica" {
  bucket   = aws_s3_bucket.backup_replica.id
  provider = aws.backup_region

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# IAM Role for S3 replication
resource "aws_iam_role" "s3_replication" {
  name = "${var.project_name}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "s3_replication" {
  name = "${var.project_name}-s3-replication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = [
          "${aws_s3_bucket.static_assets.arn}/*",
          "${aws_s3_bucket.media_content.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.static_assets.arn,
          aws_s3_bucket.media_content.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.backup_replica.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_replication" {
  role       = aws_iam_role.s3_replication.name
  policy_arn = aws_iam_policy.s3_replication.arn
}

# S3 Replication Configuration
resource "aws_s3_bucket_replication_configuration" "static_assets" {
  role   = aws_iam_role.s3_replication.arn
  bucket = aws_s3_bucket.static_assets.id

  rule {
    id     = "replicate-static-assets"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backup_replica.arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [aws_s3_bucket_versioning.static_assets]
}

resource "aws_s3_bucket_replication_configuration" "media_content" {
  role   = aws_iam_role.s3_replication.arn
  bucket = aws_s3_bucket.media_content.id

  rule {
    id     = "replicate-media-content"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backup_replica.arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [aws_s3_bucket_versioning.media_content]
}

# Backup region provider
provider "aws" {
  alias  = "backup_region"
  region = "ap-northeast-1" # Tokyo region for disaster recovery
}