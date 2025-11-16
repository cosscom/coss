export default {
  "(apps|packages)/**/*.{js,ts,jsx,tsx}": (files) =>
    `bunx eslint --fix --flag v10_config_lookup_from_file --max-warnings=0 ${files.join(" ")}`
};
