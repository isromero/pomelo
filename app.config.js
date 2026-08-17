const base = require('./app.json').expo;

module.exports = () => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return {
    ...base,
    android: {
      ...base.android,
      ...(apiKey ? {
        config: {
          ...base.android.config,
          googleMaps: { apiKey },
        },
      } : {}),
    },
  };
};
