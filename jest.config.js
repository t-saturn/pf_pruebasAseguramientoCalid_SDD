// Configuración raíz de Jest con soporte para proyectos múltiples (monorepo)
/** @type {import('jest').Config} */
module.exports = {
  // Modo de proyectos múltiples: cada workspace tiene su propia configuración
  projects: [
    '<rootDir>/apps/backend',
    '<rootDir>/apps/frontend',
    '<rootDir>/packages/shared',
  ],

  // Cobertura de código agregada de todos los proyectos
  collectCoverageFrom: [
    'apps/backend/src/**/*.ts',
    'apps/frontend/src/**/*.{ts,tsx}',
    'packages/shared/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.spec.tsx',
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/main.ts',
  ],

  // Umbrales de cobertura mínima
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Formato del reporte de cobertura
  coverageReporters: ['text', 'lcov', 'html'],

  // Reportero de resultados
  verbose: true,
};
