terraform {
  required_version = ">= 1.7.0"
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

# EmDash CMS 用に作成していた D1 / R2 / KV は Nostr 移行で不要になった。
# データ消失を避けるため、実体は削除せず Terraform の管理対象からだけ外す。
# 中身を確認・退避したら Cloudflare ダッシュボードから手動で削除してよい。
removed {
  from = cloudflare_d1_database.blog
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_r2_bucket.media
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_workers_kv_namespace.session
  lifecycle {
    destroy = false
  }
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
