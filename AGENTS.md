# Agent Guidelines for HNDV1-wbflw

## Build Commands

- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build for production (ES modules, outputs to dist/)
- `npm run build:analyze` - Build with bundle analysis
- `npm run lint:fix` - Run ESLint with auto-fix on src/ directory
- `npm run clean` - Remove dist/ directory

## Code Style Guidelines

- **Imports**: Use ES6 imports, group external/builtin first, then internal/sibling/parent. Alphabetize within groups.
- **Formatting**: Prettier config - single quotes, no semicolons, 2-space tabs, trailing comma ES5
- **Modules**: Export functions as default when single export, named exports for multiple functions
- **Dynamic Imports**: Use dynamic imports for conditional module loading based on page attributes
- **Error Handling**: Always include .catch() blocks for dynamic imports with descriptive error messages
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Comments**: Minimal comments, focus on self-documenting code
- **Webflow Integration**: Code must integrate with Webflow CMS, use data attributes for page detection
- **Performance**: Prioritize readability over performance, use early returns for clarity

## Testing

No test framework configured. Verify functionality manually in browser.

## Key Dependencies

- Three.js for 3D graphics
- GSAP/Anime.js for animations
- Rive for interactive animations
- Vite for build tooling with ES module output
