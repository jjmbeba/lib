import { defineConfig } from 'orval'

export default defineConfig({
  libraryApi: {
    input: {
      target: '../backend/openapi/openapi.yaml',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      client: 'vue-query',
      httpClient: 'fetch',
    },
  },
})
