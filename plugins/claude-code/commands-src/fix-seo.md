Audit and fix SEO and metadata gaps in the current Expo project.

1. Call `get_skill` with `seo-metadata` to load the MDS SEO skill.
2. Call `doctor_scan_project` and filter for any SEO-related findings.
3. Scan the `app/` directory for web routes missing title, description, canonical URL, or Open Graph tags.
4. Check for a sitemap and robots strategy (or note its absence).
5. Propose specific fixes for each gap — include the exact file path and the code to add.
6. Apply fixes if the user confirms, or present them as a diff for review.
