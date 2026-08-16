import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initMonitoring } from './services/monitoring';
import { env } from './config/env';
import { sequelize } from './models';
import routes from './routes';
import { errorHandler } from './middleware/error';
import { createSocketServer } from './socket';
import { mountSwagger } from './swagger';
import { runMigrations } from './scripts/migrate';
import { bootstrapFarmBotBrokers } from './services/farmbotBroker';
import { bootstrapFarmBotControl } from './services/farmbotControl';

initMonitoring();

const app = express();
const server = http.createServer(app);
const io = createSocketServer(server);
app.set('io', io);
// Traefik / Cloudflare terminate TLS and set X-Forwarded-For — required for rate-limit + secure cookies.
app.set('trust proxy', 1);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  }),
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: { message: 'Too many auth attempts', code: 'RATE_LIMITED' } },
    validate: { xForwardedForHeader: false },
  }),
);
app.use(
  '/api/capture',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
      success: false,
      error: { message: 'Too many capture requests', code: 'RATE_LIMITED' },
    },
    validate: { xForwardedForHeader: false },
  }),
);

if (env.nodeEnv !== 'production') {
  mountSwagger(app);
}
app.use('/api', routes);
app.use(errorHandler);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    await runMigrations();
    console.log('Migrations complete.');
    await bootstrapFarmBotBrokers();
    await bootstrapFarmBotControl();
    server.listen(env.port, () => {
      console.log(`Marketlist API listening on :${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start API', error);
    process.exit(1);
  }
};

start();
