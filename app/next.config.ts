import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Lean, self-contained server bundle for the Docker runtime image.
  output: "standalone",
  // This app is nested inside the Fixer standards repo; pin the roots so tracing/Turbopack
  // do not walk up to a parent lockfile.
  outputFileTracingRoot: path.join(__dirname),
  // The generated Prisma client (incl. its wasm query compiler) is imported dynamically enough
  // that file tracing can miss it — force it into the standalone bundle.
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
