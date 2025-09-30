#!/bin/bash

# Hong Kong Tourism AI Platform Deployment Script
set -e

# Configuration
PROJECT_NAME="hk-tourism-ai"
AWS_REGION="ap-southeast-1"
EKS_CLUSTER_NAME="${PROJECT_NAME}-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v aws >/dev/null 2>&1 || error "AWS CLI is required but not installed"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
    command -v terraform >/dev/null 2>&1 || error "Terraform is required but not installed"
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "AWS credentials not configured"
    
    log "Prerequisites check passed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log "Deploying infrastructure with Terraform..."
    
    cd infrastructure/terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="certificate_arn=${ACM_CERTIFICATE_ARN}" -var="monitoring_email=${MONITORING_EMAIL}"
    
    # Apply infrastructure
    terraform apply -auto-approve -var="certificate_arn=${ACM_CERTIFICATE_ARN}" -var="monitoring_email=${MONITORING_EMAIL}"
    
    # Get outputs
    export EKS_CLUSTER_ENDPOINT=$(terraform output -raw eks_cluster_endpoint)
    export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    export REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
    export ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    export CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
    
    cd ../..
    log "Infrastructure deployment completed"
}

# Configure kubectl for EKS
configure_kubectl() {
    log "Configuring kubectl for EKS cluster..."
    
    aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}
    
    # Verify connection
    kubectl cluster-info || error "Failed to connect to EKS cluster"
    
    log "kubectl configured successfully"
}

# Create Kubernetes secrets from AWS Secrets Manager
create_secrets() {
    log "Creating Kubernetes secrets..."
    
    # Get database credentials from Secrets Manager
    DB_SECRET=$(aws secretsmanager get-secret-value --secret-id ${PROJECT_NAME}/database/password --query SecretString --output text)
    DB_URL=$(echo $DB_SECRET | jq -r '.endpoint + ":" + (.port|tostring) + "/" + .dbname + "?user=" + .username + "&password=" + .password')
    
    # Get Redis credentials from Secrets Manager
    REDIS_SECRET=$(aws secretsmanager get-secret-value --secret-id ${PROJECT_NAME}/redis/auth-token --query SecretString --output text)
    REDIS_URL=$(echo $REDIS_SECRET | jq -r '"redis://:" + .auth_token + "@" + .endpoint + ":" + (.port|tostring)')
    
    # Create database secret
    kubectl create secret generic database-credentials \
        --from-literal=url="$DB_URL" \
        --namespace=${PROJECT_NAME} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Redis secret
    kubectl create secret generic redis-credentials \
        --from-literal=url="$REDIS_URL" \
        --namespace=${PROJECT_NAME} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create external API keys secret
    kubectl create secret generic external-api-keys \
        --from-literal=openweather-api-key="${OPENWEATHER_API_KEY}" \
        --from-literal=google-maps-api-key="${GOOGLE_MAPS_API_KEY}" \
        --from-literal=google-translate-api-key="${GOOGLE_TRANSLATE_API_KEY}" \
        --from-literal=hktb-api-key="${HKTB_API_KEY}" \
        --namespace=${PROJECT_NAME} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create JWT secrets
    kubectl create secret generic jwt-secrets \
        --from-literal=jwt-secret="${JWT_SECRET}" \
        --from-literal=jwt-refresh-secret="${JWT_REFRESH_SECRET}" \
        --namespace=${PROJECT_NAME} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "Secrets created successfully"
}

# Deploy applications to Kubernetes
deploy_applications() {
    log "Deploying applications to Kubernetes..."
    
    # Apply namespace
    kubectl apply -f infrastructure/kubernetes/namespace.yaml
    
    # Apply ConfigMaps
    kubectl apply -f infrastructure/kubernetes/configmaps.yaml
    
    # Apply deployments
    kubectl apply -f infrastructure/kubernetes/api-gateway-deployment.yaml
    kubectl apply -f infrastructure/kubernetes/microservices-deployment.yaml
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    kubectl rollout status deployment/api-gateway -n ${PROJECT_NAME} --timeout=600s
    kubectl rollout status deployment/user-service -n ${PROJECT_NAME} --timeout=600s
    kubectl rollout status deployment/location-service -n ${PROJECT_NAME} --timeout=600s
    kubectl rollout status deployment/recommendation-service -n ${PROJECT_NAME} --timeout=600s
    
    log "Applications deployed successfully"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Apply Prometheus configuration
    kubectl apply -f infrastructure/monitoring/prometheus-config.yaml
    
    # Apply Grafana dashboards
    kubectl apply -f infrastructure/monitoring/grafana-dashboards.yaml
    
    # Install Prometheus using Helm (if available)
    if command -v helm >/dev/null 2>&1; then
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        
        helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --create-namespace \
            --values infrastructure/monitoring/prometheus-values.yaml
    else
        warn "Helm not found, skipping Prometheus installation via Helm"
    fi
    
    log "Monitoring stack deployed"
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."
    
    # Wait for ALB to be ready
    sleep 60
    
    # Test API Gateway health endpoint
    if curl -f http://${ALB_DNS_NAME}/health; then
        log "API Gateway health check passed"
    else
        error "API Gateway health check failed"
    fi
    
    # Test user service through API Gateway
    if curl -f http://${ALB_DNS_NAME}/api/users/health; then
        log "User service health check passed"
    else
        warn "User service health check failed"
    fi
    
    # Test location service through API Gateway
    if curl -f http://${ALB_DNS_NAME}/api/locations/health; then
        log "Location service health check passed"
    else
        warn "Location service health check failed"
    fi
    
    log "Smoke tests completed"
}

# Display deployment information
display_info() {
    log "Deployment completed successfully!"
    echo ""
    echo "=== Deployment Information ==="
    echo "EKS Cluster: ${EKS_CLUSTER_NAME}"
    echo "Region: ${AWS_REGION}"
    echo "Load Balancer: ${ALB_DNS_NAME}"
    echo "CloudFront Distribution: ${CLOUDFRONT_DOMAIN}"
    echo ""
    echo "=== Useful Commands ==="
    echo "View pods: kubectl get pods -n ${PROJECT_NAME}"
    echo "View services: kubectl get services -n ${PROJECT_NAME}"
    echo "View logs: kubectl logs -f deployment/api-gateway -n ${PROJECT_NAME}"
    echo "Scale deployment: kubectl scale deployment api-gateway --replicas=5 -n ${PROJECT_NAME}"
    echo ""
    echo "=== Monitoring ==="
    echo "CloudWatch Dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${PROJECT_NAME}-dashboard"
    echo "Grafana: kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring"
    echo ""
}

# Main deployment function
main() {
    log "Starting deployment of Hong Kong Tourism AI Platform..."
    
    # Check for required environment variables
    if [[ -z "${ACM_CERTIFICATE_ARN}" ]]; then
        warn "ACM_CERTIFICATE_ARN not set, using default certificate"
        export ACM_CERTIFICATE_ARN=""
    fi
    
    if [[ -z "${MONITORING_EMAIL}" ]]; then
        export MONITORING_EMAIL="admin@hk-tourism-ai.com"
    fi
    
    # Run deployment steps
    check_prerequisites
    deploy_infrastructure
    configure_kubectl
    create_secrets
    deploy_applications
    deploy_monitoring
    run_smoke_tests
    display_info
    
    log "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        ;;
    "applications")
        configure_kubectl
        create_secrets
        deploy_applications
        ;;
    "monitoring")
        configure_kubectl
        deploy_monitoring
        ;;
    "test")
        run_smoke_tests
        ;;
    *)
        echo "Usage: $0 [deploy|infrastructure|applications|monitoring|test]"
        exit 1
        ;;
esac