output "d1_database_id" {
  value       = cloudflare_d1_database.blog.id
  description = "The ID of the D1 database for EmDash blog content."
}

output "r2_bucket_name" {
  value       = cloudflare_r2_bucket.media.name
  description = "The name of the R2 bucket for EmDash uploaded media."
}

output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.session.id
  description = "The ID of the Workers KV namespace for admin sessions."
}
