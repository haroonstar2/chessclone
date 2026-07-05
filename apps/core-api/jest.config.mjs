export default {
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

// export default {
//   preset: 'ts-jest/presets/default-esm',
//   extensionsToTreatAsEsm: ['.ts'],
//   moduleFileExtensions: ['js', 'json', 'ts'],
//   rootDir: '.',
//   testRegex: 'src/.*\\.spec\\.ts$',
//   transform: {
//     '^(?!.*(generated|node_modules)).*\\.tsx?$': [
//       'ts-jest',
//       {
//         useESM: true,
//         tsconfig: {
//           module: 'esnext',
//           target: 'ES2023',
//           moduleResolution: 'nodenext',
//           resolvePackageJsonExports: false,
//           isolatedModules: true,
//         },
//       },
//     ],
//   },
//   moduleNameMapper: {
//     '^(\\.{1,2}/.*)\\.js$': '$1',
//   },
//   collectCoverageFrom: ['src/**/*.(t|j)s'],
//   transformIgnorePatterns: ['node_modules'],
//   coverageDirectory: 'coverage',
//   testEnvironment: 'node',
// };
