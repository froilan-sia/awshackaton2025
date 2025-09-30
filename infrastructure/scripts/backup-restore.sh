#!/bin/bash

# Hong Kong Tourism AI Platform Backup and Restore Script
set -e

# Configuration
PROJECT_NAME="hk-tourism-ai"
AWS_REGION="ap-southeast-1"
BACKUP_REGION="ap-northeast-1"

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

# Create manual backup
create_backup() {
    local backup_type=${1:-"manual"}
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    log "Creating ${backup_type} backup at ${timestamp}..."
    
    # Get RDS instance identifier
    RDS_INSTANCE=$(aws rds describe-db-instances --query "DBInstances[?contains(DBInstanceIdentifier, '${PROJECT_NAME}')].DBInstanceIdentifier" --output text)
    
    if [[ -z "$RDS_INSTANCE" ]]; then
        error "RDS instance not found"
    fi
    
    # Create RDS snapshot
    SNAPSHOT_ID="${PROJECT_NAME}-${backup_type}-${timestamp}"
    log "Creating RDS snapshot: ${SNAPSHOT_ID}"
    
    aws rds create-db-snapshot \
        --db-instance-identifier "$RDS_INSTANCE" \
        --db-snapshot-identifier "$SNAPSHOT_ID" \
        --tags Key=BackupType,Value="$backup_type" Key=Timestamp,Value="$timestamp"
    
    # Wait for snapshot to complete
    log "Waiting for snapshot to complete..."
    aws rds wait db-snapshot-completed --db-snapshot-identifier "$SNAPSHOT_ID"
    
    # Create EBS snapshots for persistent volumes
    log "Creating EBS snapshots for persistent volumes..."
    
    # Get EBS volumes tagged with the project
    VOLUME_IDS=$(aws ec2 describe-volumes \
        --filters "Name=tag:Environment,Values=production" "Name=tag:Project,Values=${PROJECT_NAME}" \
        --query "Volumes[].VolumeId" --output text)
    
    for VOLUME_ID in $VOLUME_IDS; do
        if [[ -n "$VOLUME_ID" ]]; then
            VOLUME_SNAPSHOT_ID="${PROJECT_NAME}-volume-${VOLUME_ID}-${timestamp}"
            log "Creating EBS snapshot for volume ${VOLUME_ID}: ${VOLUME_SNAPSHOT_ID}"
            
            aws ec2 create-snapshot \
                --volume-id "$VOLUME_ID" \
                --description "Backup of ${VOLUME_ID} for ${PROJECT_NAME}" \
                --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=${VOLUME_SNAPSHOT_ID}},{Key=BackupType,Value=${backup_type}},{Key=Timestamp,Value=${timestamp}}]"
        fi
    done
    
    # Backup Kubernetes configurations
    log "Backing up Kubernetes configurations..."
    
    BACKUP_DIR="/tmp/${PROJECT_NAME}-k8s-backup-${timestamp}"
    mkdir -p "$BACKUP_DIR"
    
    # Export all resources in the project namespace
    kubectl get all -n "$PROJECT_NAME" -o yaml > "$BACKUP_DIR/all-resources.yaml"
    kubectl get configmaps -n "$PROJECT_NAME" -o yaml > "$BACKUP_DIR/configmaps.yaml"
    kubectl get secrets -n "$PROJECT_NAME" -o yaml > "$BACKUP_DIR/secrets.yaml"
    kubectl get pvc -n "$PROJECT_NAME" -o yaml > "$BACKUP_DIR/persistent-volume-claims.yaml"
    
    # Create tar archive
    tar -czf "${PROJECT_NAME}-k8s-backup-${timestamp}.tar.gz" -C "/tmp" "${PROJECT_NAME}-k8s-backup-${timestamp}"
    
    # Upload to S3
    S3_BACKUP_BUCKET="${PROJECT_NAME}-backups-$(aws sts get-caller-identity --query Account --output text)"
    aws s3 cp "${PROJECT_NAME}-k8s-backup-${timestamp}.tar.gz" "s3://${S3_BACKUP_BUCKET}/kubernetes-configs/"
    
    # Cleanup local files
    rm -rf "$BACKUP_DIR" "${PROJECT_NAME}-k8s-backup-${timestamp}.tar.gz"
    
    log "Backup completed successfully"
    echo "RDS Snapshot: ${SNAPSHOT_ID}"
    echo "Kubernetes Config: s3://${S3_BACKUP_BUCKET}/kubernetes-configs/${PROJECT_NAME}-k8s-backup-${timestamp}.tar.gz"
}

# List available backups
list_backups() {
    log "Listing available backups..."
    
    echo "=== RDS Snapshots ==="
    aws rds describe-db-snapshots \
        --snapshot-type manual \
        --query "DBSnapshots[?contains(DBSnapshotIdentifier, '${PROJECT_NAME}')].{ID:DBSnapshotIdentifier,Status:Status,Created:SnapshotCreateTime}" \
        --output table
    
    echo ""
    echo "=== EBS Snapshots ==="
    aws ec2 describe-snapshots \
        --owner-ids self \
        --filters "Name=tag:Project,Values=${PROJECT_NAME}" \
        --query "Snapshots[].{ID:SnapshotId,Description:Description,Status:State,Created:StartTime}" \
        --output table
    
    echo ""
    echo "=== Kubernetes Config Backups ==="
    S3_BACKUP_BUCKET="${PROJECT_NAME}-backups-$(aws sts get-caller-identity --query Account --output text)"
    aws s3 ls "s3://${S3_BACKUP_BUCKET}/kubernetes-configs/" --human-readable
}

# Restore from backup
restore_backup() {
    local snapshot_id="$1"
    local restore_type="${2:-point-in-time}"
    
    if [[ -z "$snapshot_id" ]]; then
        error "Snapshot ID is required for restore"
    fi
    
    log "Starting restore from snapshot: ${snapshot_id}"
    
    # Confirm restore operation
    read -p "This will restore the database from backup. Are you sure? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled"
        exit 0
    fi
    
    # Create new RDS instance from snapshot
    RESTORE_INSTANCE_ID="${PROJECT_NAME}-restore-$(date +%Y%m%d-%H%M%S)"
    
    log "Creating new RDS instance from snapshot: ${RESTORE_INSTANCE_ID}"
    
    aws rds restore-db-instance-from-db-snapshot \
        --db-instance-identifier "$RESTORE_INSTANCE_ID" \
        --db-snapshot-identifier "$snapshot_id" \
        --db-instance-class "db.t3.medium" \
        --tags Key=Purpose,Value=Restore Key=OriginalSnapshot,Value="$snapshot_id"
    
    # Wait for instance to be available
    log "Waiting for restored instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier "$RESTORE_INSTANCE_ID"
    
    # Get new endpoint
    NEW_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "$RESTORE_INSTANCE_ID" \
        --query "DBInstances[0].Endpoint.Address" --output text)
    
    log "Restore completed successfully"
    echo "New RDS Instance: ${RESTORE_INSTANCE_ID}"
    echo "New Endpoint: ${NEW_ENDPOINT}"
    echo ""
    echo "To use the restored database, update your application configuration with the new endpoint."
    echo "Remember to update security groups and test the restored data before switching production traffic."
}

# Disaster recovery procedure
disaster_recovery() {
    log "Starting disaster recovery procedure..."
    
    # Switch to backup region
    export AWS_DEFAULT_REGION="$BACKUP_REGION"
    
    log "Checking backup region resources..."
    
    # List available snapshots in backup region
    echo "=== Available RDS Snapshots in Backup Region ==="
    aws rds describe-db-snapshots \
        --region "$BACKUP_REGION" \
        --snapshot-type manual \
        --query "DBSnapshots[?contains(DBSnapshotIdentifier, '${PROJECT_NAME}')].{ID:DBSnapshotIdentifier,Status:Status,Created:SnapshotCreateTime}" \
        --output table
    
    # Check S3 replication status
    echo ""
    echo "=== S3 Replication Status ==="
    S3_BACKUP_BUCKET="${PROJECT_NAME}-backup-replica-$(aws sts get-caller-identity --query Account --output text)"
    aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --recursive --human-readable | head -10
    
    log "Disaster recovery assessment completed"
    echo ""
    echo "To complete disaster recovery:"
    echo "1. Deploy infrastructure in backup region using Terraform"
    echo "2. Restore database from latest snapshot"
    echo "3. Update DNS records to point to backup region"
    echo "4. Deploy applications to new EKS cluster"
    echo "5. Verify all services are operational"
}

# Cleanup old backups
cleanup_backups() {
    local retention_days="${1:-30}"
    
    log "Cleaning up backups older than ${retention_days} days..."
    
    # Calculate cutoff date
    CUTOFF_DATE=$(date -d "${retention_days} days ago" +%Y-%m-%d)
    
    # Delete old RDS snapshots
    OLD_SNAPSHOTS=$(aws rds describe-db-snapshots \
        --snapshot-type manual \
        --query "DBSnapshots[?contains(DBSnapshotIdentifier, '${PROJECT_NAME}') && SnapshotCreateTime < '${CUTOFF_DATE}'].DBSnapshotIdentifier" \
        --output text)
    
    for SNAPSHOT in $OLD_SNAPSHOTS; do
        if [[ -n "$SNAPSHOT" ]]; then
            log "Deleting old RDS snapshot: ${SNAPSHOT}"
            aws rds delete-db-snapshot --db-snapshot-identifier "$SNAPSHOT"
        fi
    done
    
    # Delete old EBS snapshots
    OLD_EBS_SNAPSHOTS=$(aws ec2 describe-snapshots \
        --owner-ids self \
        --filters "Name=tag:Project,Values=${PROJECT_NAME}" \
        --query "Snapshots[?StartTime < '${CUTOFF_DATE}'].SnapshotId" \
        --output text)
    
    for SNAPSHOT in $OLD_EBS_SNAPSHOTS; do
        if [[ -n "$SNAPSHOT" ]]; then
            log "Deleting old EBS snapshot: ${SNAPSHOT}"
            aws ec2 delete-snapshot --snapshot-id "$SNAPSHOT"
        fi
    done
    
    log "Backup cleanup completed"
}

# Main function
main() {
    case "${1:-help}" in
        "backup")
            create_backup "${2:-manual}"
            ;;
        "list")
            list_backups
            ;;
        "restore")
            restore_backup "$2" "$3"
            ;;
        "disaster-recovery")
            disaster_recovery
            ;;
        "cleanup")
            cleanup_backups "$2"
            ;;
        "help"|*)
            echo "Usage: $0 [backup|list|restore|disaster-recovery|cleanup] [options]"
            echo ""
            echo "Commands:"
            echo "  backup [type]           Create a backup (default: manual)"
            echo "  list                    List available backups"
            echo "  restore <snapshot-id>   Restore from backup"
            echo "  disaster-recovery       Start disaster recovery procedure"
            echo "  cleanup [days]          Cleanup backups older than N days (default: 30)"
            echo ""
            echo "Examples:"
            echo "  $0 backup daily"
            echo "  $0 restore hk-tourism-ai-manual-20241201-120000"
            echo "  $0 cleanup 7"
            exit 1
            ;;
    esac
}

# Check prerequisites
command -v aws >/dev/null 2>&1 || error "AWS CLI is required but not installed"
command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"

# Run main function
main "$@"