const pluginSecurity = require('eslint-plugin-security');

module.exports = [
    pluginSecurity.configs.recommended,
    {
        files: ['main.js', 'preload.js', 'renderer/**/*.js'],
        rules: {
            'security/detect-object-injection': 'error',
            'security/detect-non-literal-fs-filename': 'warn',
            'security/detect-non-literal-require': 'error',
            'security/detect-possible-timing-attacks': 'warn',
            'security/detect-eval-with-expression': 'error',
            'security/detect-child-process': 'error',
            'security/detect-disable-mustache-escape': 'error',
            'security/detect-no-csrf-before-method-override': 'warn',
            'security/detect-pseudoRandomBytes': 'error',
            'security/detect-unsafe-regex': 'warn',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
        },
    },
    {
        // Test files have looser rules
        files: ['tests/**/*.js'],
        rules: {
            'security/detect-object-injection': 'off',
            'security/detect-non-literal-fs-filename': 'off',
        },
    },
];
