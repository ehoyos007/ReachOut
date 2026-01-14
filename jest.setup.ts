import '@testing-library/jest-dom';

// Mock crypto.randomUUID for tests - returns proper UUID v4 format
const mockUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
  const hex = () => Math.random().toString(16).substring(2, 6);
  return `${hex()}${hex()}-${hex()}-4${hex().substring(1)}-${hex()}-${hex()}${hex()}${hex()}`;
};

if (typeof crypto === 'undefined') {
  global.crypto = {
    randomUUID: mockUUID,
  } as Crypto;
} else if (!crypto.randomUUID) {
  crypto.randomUUID = mockUUID;
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
