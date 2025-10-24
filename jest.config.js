export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    rootDir: '.',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    modulePaths: ['<rootDir>/src'],
    moduleDirectories: ['node_modules', 'src'],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    testRegex: '(/__tests__/.*|/tests/.*|(\\.|/)(test|spec))\\.ts$',
};
