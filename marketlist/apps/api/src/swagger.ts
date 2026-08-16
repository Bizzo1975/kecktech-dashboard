import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const spec = {
  openapi: '3.0.0',
  info: { title: 'Marketlist API', version: '1.0.0' },
  paths: {
    '/api/health': {
      get: { summary: 'Health', responses: { '200': { description: 'OK' } } },
    },
    '/api/auth/login': {
      post: { summary: 'Login', responses: { '200': { description: 'OK' } } },
    },
    '/api/lists': {
      get: { summary: 'Lists', responses: { '200': { description: 'OK' } } },
    },
  },
};

export const mountSwagger = (app: Express) => {
  if (process.env.NODE_ENV === 'production') return;
  app.get('/api/docs.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
};
