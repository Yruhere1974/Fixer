import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app is nested inside the Fixer standards repo; pin the root so Turbopack does not
  // walk up to a parent lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
