import { Sequelize } from 'sequelize';
import { env } from './env';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
});
