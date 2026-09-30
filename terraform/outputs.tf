output "custom_domain" {
  value       = cloudflare_workers_domain.blog.hostname
  description = "The custom domain assigned to the blog Worker."
}
