# Task Time Estimator

A browser-based calculator for task completion-time distributions.

Cloudflare Workers serves the three application files directly. `.assetsignore`
restricts uploads to `index.html`, `script.js`, and `style.css`.

Deploy with `bunx wrangler@4.129.0 deploy`. Missing paths serve the application,
matching the existing site behavior. Custom domains are configured separately.
