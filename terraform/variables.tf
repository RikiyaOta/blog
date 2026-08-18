variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID to provision resources in."
}

variable "project_name" {
  type        = string
  description = "Project name prefix for resources."
  default     = "blog"
}
