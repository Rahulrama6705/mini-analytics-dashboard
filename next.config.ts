import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's file tracer can't see the runtime-constructed path in
  // lib/db/client.ts, so the seeded SQLite file has to be included
  // explicitly to ship inside the deployed serverless functions.
  outputFileTracingIncludes: {
    "/**": ["./data/coral.db"],
  },
};

export default nextConfig;
