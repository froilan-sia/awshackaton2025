#!/bin/bash

# Hong Kong Tourism AI Platform Deployment Validation Script
set -e

# Configuration
PROJECT_NAME="hk-tourism-ai"
AWS_REGION="ap-southeast-1"
EKS_CLUSTER_NAME="${PROJECT_NAME}-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ INFO: $1${NC}"
}

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    info "Running test: $test_name"
    
    if eval "$test_command"; then
        log "PASSED: $test_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        error "FAILED: $test_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Infrastructure validation tests
validate_aws_infrastructure() {
    info "=== Validating AWS Infrastructure ==="
    
    # Test VPC
    run_test "VPC exists" "aws ec2 describe-vpcs --filters 'Name=tag:Name,Values=${PROJECT_NAME}-vpc' --query 'Vpcs[0].VpcId' --output text | grep -v None"
    
    # Test EKS cluster
    run_test "EKS cluster is active" "aws eks describe-cluster --name ${EKS_CLUSTER_NAME} --query 'cluster.status' --output text | grep -q ACTIVE"
    
    # Test RDS instance
    run_test "RDS instance is available" "aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, \`${PROJECT_NAME}\`)].DBInstanceStatus' --output text | grep -q available"
    
    # Test ElastiCache
    run_test "ElastiCache cluster is available" "aws elasticache describe-replication-groups --query 'ReplicationGroups[?contains(ReplicationGroupId, \`${PROJECT_NAME}\`)].Status' --output text | grep -q available"
    
    # Test Load Balancer
    run_test "Application Load Balancer exists" "aws elbv2 describe-load-balancers --names ${PROJECT_NAME}-alb --query 'LoadBalancers[0].State.Code' --output text | grep -q active"
    
    # Test CloudFront distribution
    run_test "CloudFront distribution is deployed" "aws cloudfront list-distributions --query 'DistributionList.Items[?contains(Comment, \`${PROJECT_NAME}\`)].Status' --output text | grep -q Deployed"
    
    # Test S3 buckets
    run_test "S3 static assets bucket exists" "aws s3api list-buckets --query 'Buckets[?contains(Name, \`${PROJECT_NAME}-static-assets\`)].Name' --output text | grep -q ${PROJECT_NAME}"
    
    # Test backup vault
    run_test "AWS Backup vault exists" "aws backup describe-backup-vault --backup-vault-name ${PROJECT_NAME}-backup-vault --query 'BackupVaultName' --output text | grep -q ${PROJECT_NAME}"
}

# Kubernetes validation tests
validate_kubernetes_deployment() {
    info "=== Validating Kubernetes Deployment ==="
    
    # Test kubectl connectivity
    run_test "kubectl can connect to cluster" "kubectl cluster-info --request-timeout=10s > /dev/null 2>&1"
    
    # Test namespace
    run_test "Project namespace exists" "kubectl get namespace ${PROJECT_NAME} -o name | grep -q namespace/${PROJECT_NAME}"
    
    # Test API Gateway deployment
    run_test "API Gateway deployment is ready" "kubectl get deployment api-gateway -n ${PROJECT_NAME} -o jsonpath='{.status.readyReplicas}' | grep -q '[1-9]'"
    
    # Test microservices deployments
    local services=("user-service" "location-service" "recommendation-service")
    for service in "${services[@]}"; do
        run_test "${service} deployment is ready" "kubectl get deployment ${service} -n ${PROJECT_NAME} -o jsonpath='{.status.readyReplicas}' | grep -q '[1-9]'"
    done
    
    # Test services
    run_test "API Gateway service exists" "kubectl get service api-gateway-service -n ${PROJECT_NAME} -o name | grep -q service/api-gateway-service"
    
    # Test secrets
    run_test "Database credentials secret exists" "kubectl get secret database-credentials -n ${PROJECT_NAME} -o name | grep -q secret/database-credentials"
    run_test "Redis credentials secret exists" "kubectl get secret redis-credentials -n ${PROJECT_NAME} -o name | grep -q secret/redis-credentials"
    
    # Test ConfigMaps
    run_test "API Gateway config exists" "kubectl get configmap api-gateway-config -n ${PROJECT_NAME} -o name | grep -q configmap/api-gateway-config"
    
    # Test HPA
    run_test "API Gateway HPA is configured" "kubectl get hpa api-gateway-hpa -n ${PROJECT_NAME} -o name | grep -q horizontalpodautoscaler/api-gateway-hpa"
}

# Application health tests
validate_application_health() {
    info "=== Validating Application Health ==="
    
    # Get ALB endpoint
    ALB_ENDPOINT=$(aws elbv2 describe-load-balancers --names ${PROJECT_NAME}-alb --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "")
    
    if [[ -z "$ALB_ENDPOINT" ]]; then
        error "Could not retrieve ALB endpoint"
        return 1
    fi
    
    info "Testing endpoints via ALB: $ALB_ENDPOINT"
    
    # Test API Gateway health
    run_test "API Gateway health endpoint responds" "curl -f -s --max-time 30 http://${ALB_ENDPOINT}/health > /dev/null"
    
    # Test API Gateway ready endpoint
    run_test "API Gateway ready endpoint responds" "curl -f -s --max-time 30 http://${ALB_ENDPOINT}/ready > /dev/null"
    
    # Test user service through API Gateway
    run_test "User service health via API Gateway" "curl -f -s --max-time 30 http://${ALB_ENDPOINT}/api/users/health > /dev/null"
    
    # Test location service through API Gateway
    run_test "Location service health via API Gateway" "curl -f -s --max-time 30 http://${ALB_ENDPOINT}/api/locations/health > /dev/null"
    
    # Test recommendation service through API Gateway
    run_test "Recommendation service health via API Gateway" "curl -f -s --max-time 30 http://${ALB_ENDPOINT}/api/recommendations/health > /dev/null"
}

# Database connectivity tests
validate_database_connectivity() {
    info "=== Validating Database Connectivity ==="
    
    # Test database connection from a pod
    run_test "Database connection from API Gateway pod" "kubectl exec -n ${PROJECT_NAME} deployment/api-gateway -- sh -c 'timeout 10 nc -z \$DATABASE_HOST \$DATABASE_PORT' 2>/dev/null"
    
    # Test Redis connection from a pod
    run_test "Redis connection from API Gateway pod" "kubectl exec -n ${PROJECT_NAME} deployment/api-gateway -- sh -c 'timeout 10 nc -z \$REDIS_HOST \$REDIS_PORT' 2>/dev/null"
}

# Monitoring validation tests
validate_monitoring() {
    info "=== Validating Monitoring Setup ==="
    
    # Test CloudWatch log groups
    run_test "Application log group exists" "aws logs describe-log-groups --log-group-name-prefix '/aws/eks/${PROJECT_NAME}' --query 'logGroups[0].logGroupName' --output text | grep -q ${PROJECT_NAME}"
    
    # Test CloudWatch dashboard
    run_test "CloudWatch dashboard exists" "aws cloudwatch list-dashboards --query 'DashboardEntries[?contains(DashboardName, \`${PROJECT_NAME}\`)].DashboardName' --output text | grep -q ${PROJECT_NAME}"
    
    # Test SNS topic for alerts
    run_test "SNS alerts topic exists" "aws sns list-topics --query 'Topics[?contains(TopicArn, \`${PROJECT_NAME}-alerts\`)].TopicArn' --output text | grep -q ${PROJECT_NAME}"
    
    # Test if Prometheus is running (if deployed)
    if kubectl get namespace monitoring > /dev/null 2>&1; then
        run_test "Prometheus is running" "kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].status.phase}' | grep -q Running"
    else
        warn "Monitoring namespace not found, skipping Prometheus check"
    fi
}

# Security validation tests
validate_security() {
    info "=== Validating Security Configuration ==="
    
    # Test RDS encryption
    run_test "RDS encryption is enabled" "aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, \`${PROJECT_NAME}\`)].StorageEncrypted' --output text | grep -q True"
    
    # Test ElastiCache encryption
    run_test "ElastiCache encryption is enabled" "aws elasticache describe-replication-groups --query 'ReplicationGroups[?contains(ReplicationGroupId, \`${PROJECT_NAME}\`)].AtRestEncryptionEnabled' --output text | grep -q True"
    
    # Test S3 bucket encryption
    run_test "S3 bucket encryption is enabled" "aws s3api get-bucket-encryption --bucket \$(aws s3api list-buckets --query 'Buckets[?contains(Name, \`${PROJECT_NAME}-static-assets\`)].Name' --output text) --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text | grep -q AES256"
    
    # Test security groups
    run_test "EKS security group exists" "aws ec2 describe-security-groups --filters 'Name=tag:Name,Values=${PROJECT_NAME}-eks-cluster-sg' --query 'SecurityGroups[0].GroupId' --output text | grep -v None"
    
    # Test secrets in Kubernetes
    run_test "Kubernetes secrets are properly configured" "kubectl get secrets -n ${PROJECT_NAME} --no-headers | wc -l | grep -q '[1-9]'"
}

# Performance validation tests
validate_performance() {
    info "=== Validating Performance Configuration ==="
    
    # Test auto-scaling configuration
    run_test "EKS node group auto-scaling is configured" "aws eks describe-nodegroup --cluster-name ${EKS_CLUSTER_NAME} --nodegroup-name ${PROJECT_NAME}-node-group --query 'nodegroup.scalingConfig.maxSize' --output text | grep -q '[5-9]\\|[1-9][0-9]'"
    
    # Test HPA configuration
    run_test "Horizontal Pod Autoscaler is configured" "kubectl get hpa -n ${PROJECT_NAME} --no-headers | wc -l | grep -q '[1-9]'"
    
    # Test resource limits
    run_test "Pods have resource limits configured" "kubectl get pods -n ${PROJECT_NAME} -o jsonpath='{.items[*].spec.containers[*].resources.limits}' | grep -q 'cpu\\|memory'"
    
    # Test readiness probes
    run_test "Pods have readiness probes configured" "kubectl get pods -n ${PROJECT_NAME} -o jsonpath='{.items[*].spec.containers[*].readinessProbe}' | grep -q 'httpGet'"
}

# Backup validation tests
validate_backup_configuration() {
    info "=== Validating Backup Configuration ==="
    
    # Test backup plan
    run_test "AWS Backup plan exists" "aws backup list-backup-plans --query 'BackupPlansList[?contains(BackupPlanName, \`${PROJECT_NAME}\`)].BackupPlanName' --output text | grep -q ${PROJECT_NAME}"
    
    # Test backup selections
    run_test "Backup selections are configured" "aws backup list-backup-selections --backup-plan-id \$(aws backup list-backup-plans --query 'BackupPlansList[?contains(BackupPlanName, \`${PROJECT_NAME}\`)].BackupPlanId' --output text) --query 'BackupSelectionsList[0].SelectionName' --output text | grep -q ${PROJECT_NAME}"
    
    # Test S3 replication
    run_test "S3 cross-region replication is configured" "aws s3api get-bucket-replication --bucket \$(aws s3api list-buckets --query 'Buckets[?contains(Name, \`${PROJECT_NAME}-static-assets\`)].Name' --output text) --query 'ReplicationConfiguration.Rules[0].Status' --output text | grep -q Enabled"
}

# Load testing
run_load_test() {
    info "=== Running Basic Load Test ==="
    
    ALB_ENDPOINT=$(aws elbv2 describe-load-balancers --names ${PROJECT_NAME}-alb --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "")
    
    if [[ -z "$ALB_ENDPOINT" ]]; then
        error "Could not retrieve ALB endpoint for load testing"
        return 1
    fi
    
    # Simple load test with curl
    run_test "API can handle concurrent requests" "
        for i in {1..10}; do
            curl -f -s --max-time 10 http://${ALB_ENDPOINT}/health &
        done
        wait
    "
}

# Generate deployment report
generate_report() {
    echo ""
    echo "=============================================="
    echo "    DEPLOYMENT VALIDATION REPORT"
    echo "=============================================="
    echo "Project: $PROJECT_NAME"
    echo "Region: $AWS_REGION"
    echo "Timestamp: $(date)"
    echo ""
    echo "Test Results:"
    echo "  Total Tests: $TOTAL_CHECKS"
    echo "  Passed: $PASSED_CHECKS"
    echo "  Failed: $FAILED_CHECKS"
    echo ""
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log "🎉 ALL TESTS PASSED! Deployment is healthy."
        echo ""
        echo "Deployment Information:"
        echo "  EKS Cluster: $EKS_CLUSTER_NAME"
        echo "  Load Balancer: $(aws elbv2 describe-load-balancers --names ${PROJECT_NAME}-alb --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo 'Not found')"
        echo "  CloudFront: $(aws cloudfront list-distributions --query 'DistributionList.Items[?contains(Comment, `'${PROJECT_NAME}'`)].DomainName' --output text 2>/dev/null || echo 'Not found')"
        echo ""
        echo "Next Steps:"
        echo "  1. Monitor application performance in CloudWatch"
        echo "  2. Set up alerts and notifications"
        echo "  3. Configure DNS records if needed"
        echo "  4. Run comprehensive end-to-end tests"
        return 0
    else
        error "❌ $FAILED_CHECKS tests failed. Please review and fix issues before proceeding."
        echo ""
        echo "Common troubleshooting steps:"
        echo "  1. Check CloudFormation/Terraform logs"
        echo "  2. Verify AWS credentials and permissions"
        echo "  3. Check Kubernetes pod logs: kubectl logs -n $PROJECT_NAME <pod-name>"
        echo "  4. Verify security group and network configuration"
        echo "  5. Check resource quotas and limits"
        return 1
    fi
}

# Main validation function
main() {
    info "Starting deployment validation for $PROJECT_NAME..."
    echo ""
    
    # Check prerequisites
    command -v aws >/dev/null 2>&1 || { error "AWS CLI is required but not installed"; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { error "kubectl is required but not installed"; exit 1; }
    command -v curl >/dev/null 2>&1 || { error "curl is required but not installed"; exit 1; }
    
    # Configure kubectl
    aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME >/dev/null 2>&1 || warn "Could not update kubeconfig"
    
    # Run validation tests
    case "${1:-all}" in
        "infrastructure"|"infra")
            validate_aws_infrastructure
            ;;
        "kubernetes"|"k8s")
            validate_kubernetes_deployment
            ;;
        "application"|"app")
            validate_application_health
            ;;
        "database"|"db")
            validate_database_connectivity
            ;;
        "monitoring")
            validate_monitoring
            ;;
        "security")
            validate_security
            ;;
        "performance"|"perf")
            validate_performance
            ;;
        "backup")
            validate_backup_configuration
            ;;
        "load-test")
            run_load_test
            ;;
        "all"|*)
            validate_aws_infrastructure
            validate_kubernetes_deployment
            validate_application_health
            validate_database_connectivity
            validate_monitoring
            validate_security
            validate_performance
            validate_backup_configuration
            run_load_test
            ;;
    esac
    
    # Generate report
    generate_report
}

# Handle script arguments
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi