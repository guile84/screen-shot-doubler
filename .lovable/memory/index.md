# Project Memory

## Core
Affiliate platform: admin panel & public pages.
Stack: React, Vite, React Router, Tailwind, Supabase (DB, Auth, Storage), Edge Functions.
Nav: Home (/), Tabs (/cupons, /sites), Admin (/admin). Protected admin routes.

## Memories
- [Database Schema](mem://tech/database-schema) — Supabase schema details (tables for products, media, coupons, sites, clicks)
- [Design System](mem://style/design-system) — Tailwind semantic tokens (blue primary, success, warning, info)
- [Tracking System](mem://features/tracking-system) — Click tracking (IP, referrer, user agent) for products, coupons, and sites
- [Product Management](mem://features/product-management) — Product CRUD, automated external image download, pricing fields
- [Public Product View](mem://features/public-product-view) — Carousel, video embed, copy-to-clipboard coupon
- [Analytics Dashboard](mem://features/analytics-dashboard) — Admin stats with Recharts (7-day clicks, rankings)
- [Public Portfolio](mem://features/public-portfolio) — Home page tabs, accent-insensitive search, responsive cards
- [Company Branding](mem://features/company-branding) — Dynamic logo/name sync for favicon, title, and OG tags
- [Coupon Management](mem://features/coupon-management) — Admin CRUD for coupons (images, codes, destination links, duplicate)
- [Site Management](mem://features/site-management) — Admin CRUD for outbound external links with automated media download
- [Product Groups](mem://features/product-groups) — Groups with slug, admin CRUD, public page at /g/:slug
- [Profile Links](mem://features/profile-links) — Linktree-style profile with emoji or image icons
- [Image Display Config](mem://features/image-display-config) — object-fit (cover/contain) and focal point per media item
