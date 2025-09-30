# Variables for Hong Kong Tourism AI Platform Infrastructure

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "hk-tourism-ai"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1" # Singapore region for Hong Kong proximity
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
}

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

variable "node_group_instance_types" {
  description = "Instance types for EKS node group"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "node_group_desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

variable "node_group_max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_group_min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 1
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "hk-tourism-ai.com"
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
  default     = ""
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "monitoring_email" {
  description = "Email for monitoring alerts"
  type        = string
  default     = "admin@hk-tourism-ai.com"
}