module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^common/(.*)$': '<rootDir>/src/common/$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!axios)/'
  ],
  moduleDirectories: ['node_modules', 'src'],
};
