variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID to provision resources in."
}

variable "project_name" {
  type        = string
  description = "Project name prefix for resources."
  default     = "blog"
}

variable "zone_name" {
  type        = string
  description = "Cloudflare Zone (Apex Domain) name."
  default     = "rikiyaota.kyoto"
}

variable "custom_domain" {
  type        = string
  description = "Custom domain hostname for the blog Worker."
  default     = "blog.rikiyaota.kyoto"
}
