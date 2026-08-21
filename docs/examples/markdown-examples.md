# Markdown Extension Examples

This page demonstrates some of the built-in markdown extensions provided by VitePress.

## Syntax Highlighting

VitePress provides Syntax Highlighting powered by [Shiki](https://github.com/shikijs/shiki).

### Output

```js
export default {
  name: 'MyComponent',
  // ...
}
```

### Recommended `vite.config.js`

```js
import { defineConfig } from 'vite'

export default defineConfig({
  // ...
})
```

## Custom Containers

::: info
This is an info box.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::

## Math Equations

When $a \ne 0$, there are two solutions to $(ax^2 + bx + c = 0)$ and they are
$$ x = {-b \pm \sqrt{b^2-4ac} \over 2a} $$

**Maxwell's equations:**

| equation                                                                                                                                                                 | description                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| $\nabla \cdot \vec{\mathbf{B}}  = 0$                                                                                                                                     | divergence of $\vec{\mathbf{B}}$ is zero                                               |
| $\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t}  = \vec{\mathbf{0}}$                                                          | curl of $\vec{\mathbf{E}}$ is proportional to the rate of change of $\vec{\mathbf{B}}$ |
| $\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} = \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} = 4 \pi \rho$ | _wha?_                                                                                 |

## Icons

Inline icons written as `::set:name::`, rendered to inline SVG at build time:

Made with ::simple-icons:vuedotjs:: Vue and ::simple-icons:typescript:: TypeScript.

Size modifier is supported (icons stay single-color and follow the text color,
adapting to light/dark themes): ::simple-icons:github =24:: ::simple-icons:pnpm =32::

::: warning Prefer single-color icons
Colored icons with fixed `/color` don't adapt to light/dark themes. Prefer
monochrome icon sets (e.g. `simple-icons`, `tabler`, `mdi`) and avoid `/color`
unless you intentionally brand a specific icon.
:::

## More

See [Markdown Extensions](https://vitepress.dev/guide/markdown) for more.
