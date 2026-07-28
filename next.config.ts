import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  // Indique à Node.js de créer un fichier localStorage persistant
  // pour éviter l'avertissement : 
  // "ExperimentalWarning: localStorage is not available because --localstorage-file was not provided"
  serverExternalPackages: [],
};

export default nextConfig;
