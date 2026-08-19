function validateProductionApiUrl() {
  const isProductionBuild = process.env.NODE_ENV === "production"
    || process.env.EAS_BUILD_PROFILE === "production";
  if (!isProductionBuild) return;

  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for production builds.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTPS for production builds.");
  }
}

module.exports = ({ config }) => {
  validateProductionApiUrl();
  return config;
};
