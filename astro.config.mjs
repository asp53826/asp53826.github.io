import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://asp53826.github.io",
  integrations: [react()],
  output: "static",
  build: {
    inlineStylesheets: "auto"
  }
});
