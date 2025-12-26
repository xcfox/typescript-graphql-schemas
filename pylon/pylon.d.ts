import '@getcronit/pylon'
import { Loaders } from './src/loaders.ts'

declare module '@getcronit/pylon' {
  interface Bindings {}

  interface Variables {
    loaders: Loaders
  }
}
