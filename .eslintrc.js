module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "es6",
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "prettier",
  ],
};
