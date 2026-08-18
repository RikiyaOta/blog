terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.52.0"
    }
  }

  backend "s3" {
    bucket                      = "blog-tfstate"
    key                         = "terraform.tfstate"
    region                      = "auto"
    endpoint                    = "https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    skip_metadata_api_check     = true
  }
}

provider "cloudflare" {
  # CLOUDFLARE_API_TOKEN 環境変数から自動読み込み
}

# D1 Database for EmDash Posts and Content
resource "cloudflare_d1_database" "blog" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-db"
}

# R2 Bucket for EmDash Uploaded Media and Images
resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-media"
  location   = "APAC"
}

# KV Namespace for Admin Auth and Sessions
resource "cloudflare_workers_kv_namespace" "session" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}-session"
}

# Zone Lookup for Custom Domain
data "cloudflare_zone" "main" {
  account_id = var.cloudflare_account_id
  name       = var.zone_name
}

# Custom Domain for the Blog Worker
resource "cloudflare_workers_domain" "blog" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.main.id
  hostname   = var.custom_domain
  service    = var.project_name
}
