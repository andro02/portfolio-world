import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Split the big libraries into chunks of their own instead of one huge
        // file. The browser downloads them in parallel, and after a change to
        // the site's own code visitors only download the small app chunk
        // again; the libraries stay cached. Groups with a higher priority
        // are checked first.
        codeSplitting: {
          groups: [
            {
              // the Rapier physics engine, with its WebAssembly inside (the
              // largest part); only the engine itself: a group also takes in
              // everything its modules import, and the React bindings of
              // Rapier import three.js
              name: 'physics',
              test: /[\\/]node_modules[\\/]@dimforge[\\/]/,
              priority: 3,
            },
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 2 },
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            // everything else from node_modules (React Three Fiber, drei, ...)
            { name: 'vendor', test: /[\\/]node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
    // the physics chunk is big because the engine's WebAssembly is built into
    // it; that's expected, so don't warn about it
    chunkSizeWarningLimit: 2500,
  },
});
