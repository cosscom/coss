// Sentry's Expo config: gives each bundle and its source map the same debug id, so the source
// maps uploaded by the native build symbolicate crashes.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
