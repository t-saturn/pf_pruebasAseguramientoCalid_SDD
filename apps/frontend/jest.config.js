// Configuración de Jest para el workspace del frontend Next.js
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'frontend',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',

  // Patrón de archivos de prueba
  testRegex: '.*\\.(spec|test)\\.tsx?$',

  // Transformación de TypeScript
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  // Resolución de módulos internos del monorepo
  moduleNameMapper: {
    '^@mindflow/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/layout.tsx',
    '!src/**/page.tsx',
  ],

  testTimeout: 30000,
};
