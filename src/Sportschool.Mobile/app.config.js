function validateReleaseApiUrl() {
  const easBuildProfile = process.env.EAS_BUILD_PROFILE;
  const isReleaseBuild = process.env.NODE_ENV === "production"
    || easBuildProfile === "preview"
    || easBuildProfile === "production";
  if (!isReleaseBuild) return;

  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for preview and production builds.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTPS for preview and production builds.");
  }
}

module.exports = ({ config }) => {
  validateReleaseApiUrl();
  return config;
};
