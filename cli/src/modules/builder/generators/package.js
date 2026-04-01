/**
 * Package Generator - 生成 package.json
 */
export function generatePackage(projectName, options = {}) {
  const {
    testFramework = 'vitest',
    withTests = true
  } = options;

  const pkg = {
    name: projectName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      test: testFramework === 'vitest' ? 'vitest' : 'jest',
      'test:watch': testFramework === 'vitest' ? 'vitest watch' : 'jest --watch',
      coverage: testFramework === 'vitest' ? 'vitest coverage' : 'jest --coverage'
    },
    dependencies: {},
    devDependencies: {
      'vite': '^5.0.0'
    }
  };

  if (testFramework === 'vitest') {
    pkg.devDependencies.vitest = '^1.0.0';
  } else {
    pkg.devDependencies.jest = '^29.0.0';
    pkg.devDependencies['@types/jest'] = '^29.0.0';
  }

  return JSON.stringify(pkg, null, 2);
}

export function generateVitestConfig() {
  const config = {
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.js'],
      coverage: {
        reporter: ['text', 'json', 'html']
      }
    }
  };
  return `import { defineConfig } from 'vitest/config';

export default defineConfig(${JSON.stringify(config, null, 2)});`;
}

export function generateJestConfig() {
  const config = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js'],
    coverageDirectory: 'coverage',
    moduleFileExtensions: ['js', 'json']
  };
  return `module.exports = ${JSON.stringify(config, null, 2)};`;
}
