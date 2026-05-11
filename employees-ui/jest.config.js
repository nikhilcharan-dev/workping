/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.jsx', '**/__tests__/**/*.test.js'],
  transform: {},
  moduleFileExtensions: ['js', 'jsx', 'json'],
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx', '!src/assets/**'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  forceExit: true,
};
