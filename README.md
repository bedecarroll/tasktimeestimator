# Task Time Estimator

A browser-based calculator for task completion-time distributions.

Pushes to `master` automatically deploy to Cloudflare Workers at
[tasktimeestimator.com](https://tasktimeestimator.com). `.assetsignore`
restricts uploads to `index.html`, `script.js`, and `style.css`.

Deploy with `bunx wrangler@4.129.0 deploy`. Missing paths serve the application,
matching the existing site behavior. Custom domains are configured separately.
