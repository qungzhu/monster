// Lets `node --experimental-strip-types` import src/*.ts modules that use
// extensionless relative imports (as Vite allows): retry with ".ts".
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});
