// TypeScript 6+ checks that side-effect imports such as `import "./globals.css"`
// resolve to a module. Next.js 16.3+ ships this declaration itself; this
// project is on Next.js 16.1, so it is declared here. Type-only.
declare module "*.css" {}
