# ElastiCache Redis Configuration for Caching and Session Management

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "${var.project_name}-cache-subnet-group"
    Environment = var.environment
  }
}

# ElastiCache Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-redis-sg"
    Environment = var.environment
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7.x"
  name   = "${var.project_name}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = {
    Name        = "${var.project_name}-redis-params"
    Environment = var.environment
  }
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-redis"
  description                = "Redis cluster for ${var.project_name}"
  
  # Node configuration
  node_type               = var.redis_node_type
  port                    = 6379
  parameter_group_name    = aws_elasticache_parameter_group.main.name
  
  # Cluster configuration
  num_cache_clusters      = var.redis_num_cache_nodes
  
  # Network
  subnet_group_name       = aws_elasticache_subnet_group.main.name
  security_group_ids      = [aws_security_group.redis.id]
  
  # Backup and maintenance
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth_token.result
  
  # Automatic failover
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Engine version
  engine_version = "7.0"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Name        = "${var.project_name}-redis-cluster"
    Environment = var.environment
  }
}

# Random auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# Store Redis auth token in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name = "${var.project_name}/redis/auth-token"
  
  tags = {
    Name        = "${var.project_name}-redis-auth-token"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    endpoint   = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = aws_elasticache_replication_group.main.port
  })
}

# CloudWatch Log Group for Redis slow logs
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${var.project_name}/slow-log"
  retention_in_days = 14

  tags = {
    Name        = "${var.project_name}-redis-slow-log"
    Environment = var.environment
  }
}