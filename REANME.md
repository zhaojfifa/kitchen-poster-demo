# Kitchen Poster Demo

This demo renders an interactive poster editor using React 18.  The inline script in `index.html` has been moved to `src/poster-app.js` and is now loaded as an ES module.

## Running

Serve the repository with any static file server (for example `npx http-server .`) and open `index.html` in the browser.  Make sure the `src/` directory is also served so that the module can be loaded.

## Building

The module exports the `exportPNG` and `exportPDF` helpers as well as the main `App` component.  If you edit `src/poster-app.js` and use JSX syntax, transpile it with a tool such as Babel before deploying:

```bash
npx babel src/poster-app.js --presets @babel/preset-react --out-file src/poster-app.js
```