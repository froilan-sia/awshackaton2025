# CloudFront CDN Configuration for Media Content and Static Assets

# S3 Bucket for static assets
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.project_name}-static-assets-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "${var.project_name}-static-assets"
    Environment = var.environment
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket public access block
resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for media content
resource "aws_s3_bucket" "media_content" {
  bucket = "${var.project_name}-media-content-${random_id.media_bucket_suffix.hex}"

  tags = {
    Name        = "${var.project_name}-media-content"
    Environment = var.environment
  }
}

resource "random_id" "media_bucket_suffix" {
  byte_length = 4
}

# S3 Bucket versioning for media
resource "aws_s3_bucket_versioning" "media_content" {
  bucket = aws_s3_bucket.media_content.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption for media
resource "aws_s3_bucket_server_side_encryption_configuration" "media_content" {
  bucket = aws_s3_bucket.media_content.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket public access block for media
resource "aws_s3_bucket_public_access_block" "media_content" {
  bucket = aws_s3_bucket.media_content.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "static_assets" {
  name                              = "${var.project_name}-static-assets-oac"
  description                       = "OAC for static assets bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "media_content" {
  name                              = "${var.project_name}-media-content-oac"
  description                       = "OAC for media content bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  # Static Assets Origin
  origin {
    domain_name              = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.static_assets.id
    origin_id                = "S3-${aws_s3_bucket.static_assets.bucket}"
  }

  # Media Content Origin
  origin {
    domain_name              = aws_s3_bucket.media_content.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media_content.id
    origin_id                = "S3-${aws_s3_bucket.media_content.bucket}"
  }

  # API Gateway Origin
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${var.project_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} CDN"
  default_root_object = "index.html"

  # Aliases
  aliases = var.certificate_arn != "" ? [var.domain_name, "www.${var.domain_name}"] : []

  # Default cache behavior for API
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${var.project_name}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "CloudFront-Forwarded-Proto", "Host"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    compress = true
  }

  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.static_assets.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 86400
    max_ttl                = 31536000

    compress = true
  }

  # Media content cache behavior
  ordered_cache_behavior {
    path_pattern     = "/media/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.media_content.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 86400
    max_ttl                = 31536000

    compress = true
  }

  # Price class
  price_class = "PriceClass_All"

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL Certificate
  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == ""
    acm_certificate_arn           = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method            = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version      = var.certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  # Logging
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }

  tags = {
    Name        = "${var.project_name}-cloudfront"
    Environment = var.environment
  }
}

# S3 Bucket for CloudFront logs
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket = "${var.project_name}-cloudfront-logs-${random_id.logs_bucket_suffix.hex}"

  tags = {
    Name        = "${var.project_name}-cloudfront-logs"
    Environment = var.environment
  }
}

resource "random_id" "logs_bucket_suffix" {
  byte_length = 4
}

# S3 Bucket policy for CloudFront to write logs
resource "aws_s3_bucket_policy" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudfront_logs.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

# S3 Bucket policies for CloudFront OAC
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "media_content" {
  bucket = aws_s3_bucket.media_content.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media_content.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}