import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        languageOptions: { globals: globals.browser },
        ignores: [
            "**/ui/web/assets/**", // Ignore all matching paths recursively
            "ui/web/assets/**",   // Standard ignore
            "./ui/web/assets/**", // Explicit relative ignore
        ],
    },
    pluginJs.configs.recommended,
];
