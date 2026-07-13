import { defineConfig } from "vite";

export default defineConfig({
  base: "/dotfield/test-site/",
  build: {
    outDir: "../../test-site",
    emptyOutDir: true,
  },
});
