# Hong Kong Tourism AI Platform - Production Infrastructure

This directory contains the production infrastructure configuration for the Hong Kong Tourism AI Platform, including cloud infrastructure, Kubernetes deployments, monitoring, and deployment automation.

## Architecture Overview

The platform is deployed on AWS using a microservices architecture with the following components:

- **EKS Cluster**: Kubernetes cluster for container orchestration with auto-scaling
- **RDS PostgreSQL**: Primary database with read replica for disaster recovery
- **ElastiCache Redis**: Caching and session management
- **Application Load Balancer**: Load balancing and SSL termination
- **CloudFront CDN**: Content delivery network for static assets and media
- **S3 Buckets**: Static assets, media content, and backup storage
- **AWS Backup**: Automated backup and disaster recovery
- **CloudWatch**: Monitoring, logging, and alerting

## Directory Structure

```
infrastructure/
├── terraform/              # Infrastructure as Code
│   ├── main.tf             # VPC and networking
│   ├── eks.tf              # EKS cluster configuration
│   ├── rds.tf              # Database configuration
│   ├── redis.tf            # Redis cache configuration
│   ├── cloudfront.tf       # CDN configuration
│   ├── alb.tf              # Load balancer configuration
│   ├── monitoring.tf       # CloudWatch monitoring
│   ├── backup.tf           # Backup and disaster recovery
│   ├── variables.tf        # Terraform variables
│   └── outputs.tf          # Terraform outputs
├── kubernetes/             # Kubernetes manifests
│   ├── namespace.yaml      # Namespaces
│   ├── api-gateway-deployment.yaml
│   ├── microservices-deployment.yaml
│   ├── secrets.yaml        # Secret templates
│   └── configmaps.yaml     # Configuration maps
├── monitoring/             # Monitoring configuration
│   ├── prometheus-config.yaml
│   └── grafana-dashboards.yaml
└── scripts/                # Deployment and management scripts
    ├── deploy.sh           # Main deployment script
    └── backup-restore.sh   # Backup and restore utilities
```

## Prerequisites

Before deploying, ensure you have the following tools installed:

- [AWS CLI](https://aws.amazon.com/cli/) v2.x
- [Terraform](https://www.terraform.io/) v1.6+
- [kubectl](https://kubernetes.io/docs/tasks/tools/) v1.28+
- [Docker](https://www.docker.com/) v20.x+
- [Helm](https://helm.sh/) v3.x (optional, for monitoring stack)

## Environment Variables

Set the following environment variables before deployment:

```bash
# Required
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="ap-southeast-1"

# Optional (will use defaults if not set)
export ACM_CERTIFICATE_ARN="arn:aws:acm:region:account:certificate/cert-id"
export MONITORING_EMAIL="admin@hk-tourism-ai.com"

# API Keys (for application configuration)
export OPENWEATHER_API_KEY="your-openweather-key"
export GOOGLE_MAPS_API_KEY="your-google-maps-key"
export GOOGLE_TRANSLATE_API_KEY="your-google-translate-key"
export HKTB_API_KEY="your-hktb-key"
export JWT_SECRET="your-jwt-secret"
export JWT_REFRESH_SECRET="your-jwt-refresh-secret"
```

## Quick Start

### 1. Deploy Complete Infrastructure

```bash
# Make scripts executable
chmod +x infrastructure/scripts/*.sh

# Deploy everything (infrastructure + applications)
./infrastructure/scripts/deploy.sh
```

### 2. Deploy Components Separately

```bash
# Deploy only infrastructure
./infrastructure/scripts/deploy.sh infrastructure

# Deploy only applications
./infrastructure/scripts/deploy.sh applications

# Deploy only monitoring
./infrastructure/scripts/deploy.sh monitoring

# Run smoke tests
./infrastructure/scripts/deploy.sh test
```

## Manual Deployment Steps

### 1. Deploy Infrastructure with Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="certificate_arn=${ACM_CERTIFICATE_ARN}"

# Apply infrastructure
terraform apply -var="certificate_arn=${ACM_CERTIFICATE_ARN}"
```

### 2. Configure kubectl

```bash
# Update kubeconfig for EKS
aws eks update-kubeconfig --region ap-southeast-1 --name hk-tourism-ai-cluster

# Verify connection
kubectl cluster-info
```

### 3. Deploy Applications

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmaps.yaml
kubectl apply -f infrastructure/kubernetes/api-gateway-deployment.yaml
kubectl apply -f infrastructure/kubernetes/microservices-deployment.yaml

# Check deployment status
kubectl get pods -n hk-tourism-ai
```

## Monitoring and Observability

### CloudWatch Dashboard

Access the CloudWatch dashboard at:
```
https://ap-southeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-1#dashboards:name=hk-tourism-ai-dashboard
```

### Prometheus and Grafana

If Helm is installed, Prometheus and Grafana are automatically deployed:

```bash
# Access Grafana dashboard
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Default credentials: admin/prom-operator
```

### Application Logs

```bash
# View API Gateway logs
kubectl logs -f deployment/api-gateway -n hk-tourism-ai

# View specific service logs
kubectl logs -f deployment/user-service -n hk-tourism-ai

# View all pods logs
kubectl logs -f -l app=api-gateway -n hk-tourism-ai
```

## Backup and Disaster Recovery

### Create Manual Backup

```bash
# Create a manual backup
./infrastructure/scripts/backup-restore.sh backup manual

# List available backups
./infrastructure/scripts/backup-restore.sh list
```

### Restore from Backup

```bash
# Restore from a specific snapshot
./infrastructure/scripts/backup-restore.sh restore hk-tourism-ai-manual-20241201-120000
```

### Disaster Recovery

```bash
# Start disaster recovery procedure
./infrastructure/scripts/backup-restore.sh disaster-recovery
```

### Cleanup Old Backups

```bash
# Cleanup backups older than 30 days
./infrastructure/scripts/backup-restore.sh cleanup 30
```

## Scaling

### Manual Scaling

```bash
# Scale API Gateway
kubectl scale deployment api-gateway --replicas=5 -n hk-tourism-ai

# Scale recommendation service
kubectl scale deployment recommendation-service --replicas=10 -n hk-tourism-ai
```

### Auto-scaling

The platform includes Horizontal Pod Autoscalers (HPA) that automatically scale based on:
- CPU utilization (70% threshold)
- Memory utilization (80% threshold)

### Cluster Auto-scaling

EKS cluster auto-scaling is configured to:
- Minimum nodes: 1
- Maximum nodes: 10
- Desired nodes: 3

## Security

### Network Security

- VPC with public and private subnets
- Security groups with minimal required access
- NAT Gateways for private subnet internet access
- Application Load Balancer with SSL termination

### Data Security

- RDS encryption at rest
- Redis encryption in transit and at rest
- S3 bucket encryption
- Secrets stored in AWS Secrets Manager
- Kubernetes secrets for sensitive configuration

### Access Control

- IAM roles with least privilege access
- EKS RBAC for Kubernetes access
- Service-to-service authentication via JWT

## Troubleshooting

### Common Issues

1. **EKS cluster not accessible**
   ```bash
   aws eks update-kubeconfig --region ap-southeast-1 --name hk-tourism-ai-cluster
   ```

2. **Pods stuck in Pending state**
   ```bash
   kubectl describe pod <pod-name> -n hk-tourism-ai
   kubectl get events -n hk-tourism-ai
   ```

3. **Database connection issues**
   ```bash
   kubectl get secrets database-credentials -n hk-tourism-ai -o yaml
   ```

4. **Load balancer not accessible**
   ```bash
   kubectl get svc -n hk-tourism-ai
   aws elbv2 describe-load-balancers --names hk-tourism-ai-alb
   ```

### Health Checks

```bash
# Check all pods status
kubectl get pods -n hk-tourism-ai

# Check services
kubectl get svc -n hk-tourism-ai

# Check ingress/load balancer
kubectl get ingress -n hk-tourism-ai

# Test API endpoints
curl -f http://<alb-dns-name>/health
```

## Cost Optimization

### Resource Optimization

- Use spot instances for non-critical workloads
- Implement proper resource requests and limits
- Use S3 Intelligent Tiering for storage
- Enable CloudWatch cost monitoring

### Monitoring Costs

```bash
# View current costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

## CI/CD Integration

The platform includes GitHub Actions workflows for automated deployment:

- **Continuous Integration**: Automated testing on pull requests
- **Continuous Deployment**: Automated deployment to production on main branch
- **Security Scanning**: Automated security scans
- **Performance Testing**: Load testing during deployment

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review monitoring alerts
   - Check backup status
   - Review security logs

2. **Monthly**:
   - Update dependencies
   - Review and optimize costs
   - Test disaster recovery procedures

3. **Quarterly**:
   - Security audit
   - Performance optimization
   - Capacity planning review

### Getting Help

For issues and questions:
1. Check the troubleshooting section above
2. Review CloudWatch logs and metrics
3. Check Kubernetes events and pod logs
4. Contact the development team

## License

This infrastructure configuration is part of the Hong Kong Tourism AI Platform project.