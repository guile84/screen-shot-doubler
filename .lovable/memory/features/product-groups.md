---
name: Product Groups
description: Product groups with slug-based public pages for curated collections
type: feature
---
- Tables: product_groups (name, slug, description, status), product_group_items (group_id, product_id, sort_order)
- Admin: /admin/grupos — CRUD groups, manage products in each group
- Public: /g/:slug — shows products in group with back button to /profile
- Groups appear in admin sidebar nav
