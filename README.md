# React + Vite

Minimal setup: React + Vite with HMR and ESLint rules.

Two official plugins:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

Not enabled — impacts dev & build perf. To add: [documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

For prod apps, use TypeScript with type-aware lint rules. See [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for TypeScript + [`typescript-eslint`](https://typescript-eslint.io) integration.
