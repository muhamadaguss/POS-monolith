import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // process.cwd() akan mengarah ke folder 'apps/frontend'
    // kita naik 2 tingkat ke atas untuk mencapai root 'Point-of-sales'
    root: path.resolve(process.cwd(), "../../"),
  },
};

export default nextConfig;
