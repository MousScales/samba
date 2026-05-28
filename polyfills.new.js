/**
 * React Native Polyfills for Hermes Engine
 */

// Detect Hermes engine
const isHermes = () => !!global.HermesInternal;

console.log(`Running on ${isHermes() ? 'Hermes' : 'JSC'} JavaScript engine`);

// Safer property definition
const safeDefineProperty = (obj, prop, descriptor) => {
  try {
    const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (!existingDescriptor || existingDescriptor.configurable) {
      Object.defineProperty(obj, prop, {
        ...descriptor,
        configurable: descriptor.configurable !== false
      });
    } else {
      console.warn(`Property ${prop} is not configurable, skipping definition`);
    }
  } catch (error) {
    console.warn(`Error defining property ${prop}:`, error);
  }
};

// Global shims
if (typeof global.window === 'undefined') {
  global.window = global;
}

if (typeof global.self === 'undefined') {
  global.self = global;
}

// Process shim
if (typeof global.process === 'undefined') {
  safeDefineProperty(global, 'process', {
    value: {
      env: {},
      nextTick: (callback, ...args) => setTimeout(() => callback(...args), 0),
      browser: true,
      version: '',
      platform: 'react-native'
    },
    writable: true,
    configurable: true
  });
}

// Buffer shim
if (typeof global.Buffer === 'undefined') {
  safeDefineProperty(global, 'Buffer', {
    value: {
      isBuffer: () => false,
      from: () => ({ length: 0 })
    },
    writable: true,
    configurable: true
  });
}

// URL shim
if (typeof global.URL === 'undefined') {
  safeDefineProperty(global, 'URL', {
    value: class URL {
      constructor(url, base) {
        this.href = url;
        this.pathname = url;
      }
    },
    writable: true,
    configurable: true
  });
}

// Document shim
if (typeof global.document === 'undefined') {
  safeDefineProperty(global, 'document', {
    value: {
      createElement: () => ({}),
      createElementNS: () => ({}),
      getElementsByTagName: () => []
    },
    writable: true,
    configurable: true
  });
}

// Navigator shim
if (typeof global.navigator === 'undefined') {
  safeDefineProperty(global, 'navigator', {
    value: {
      product: 'ReactNative',
      userAgent: 'React Native'
    },
    writable: true,
    configurable: true
  });
}

// Export an empty object - this file is meant to be imported for its side effects
export default {}; 