# SEO Metadata Rule

Production Expo web routes should have a route-level metadata strategy.

Warn when web apps have no obvious title, description, sitemap, robots, Open
Graph, canonical, or dynamic-route metadata plan.

For static output, route `<Head>` metadata must be present in generated HTML.
For server output, prefer `generateMetadata` and keep the Expo Router route
outlet mounted during server rendering so data-loader content is present in the
initial response. A server-only loading shell is not crawlable route content.

Loader-backed dynamic detail routes should emit one deterministic JSON-LD
payload appropriate to the page type. Verify the raw production response—not
only the hydrated browser DOM—and reject duplicate canonical or JSON-LD tags.

