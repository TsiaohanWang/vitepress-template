// Type shim so theme TypeScript can import single-file components.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}
