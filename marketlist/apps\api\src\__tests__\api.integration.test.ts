import express from 'express';
import request from 'supertest';
import { sequelize } from '../models';
import { runMigrations } from '../scripts/migrate';

/**
 * Full stack integration (auth + DB) stays behind RUN_INTEGRATION=1.
 * CI sets RUN_INTEGRATION=1 with Postgres service.
 */
const runIntegration = process.env.RUN_INTEGRATION === '1';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('API integration', () => {
  let app: express.Express;

  beforeAll(async () => {
    await sequelize.authenticate();
    await runMigrations();
    const routes = (await import('../routes')).default;
    const { errorHandler } = await import('../middleware/error');
    app = express();
    app.use(express.json());
    app.use('/api', routes);
    app.use(errorHandler);
  }, 120000);

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('POST /api/auth/login rejects bad credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'wrong-password-here',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects cross-household spending and store access (AuthZ)', async () => {
    const stamp = Date.now();
    const owner = await request(app)
      .post('/api/auth/register')
      .send({
        email: `owner-${stamp}@example.com`,
        password: 'password12345',
        name: 'Owner',
      });
    expect(owner.status).toBe(201);
    const ownerToken = owner.body.data.accessToken as string;

    const hh = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `HH-${stamp}` });
    expect(hh.status).toBe(201);
    const householdId = hh.body.data.household.id as string;

    const outsider = await request(app)
      .post('/api/auth/register')
      .send({
        email: `out-${stamp}@example.com`,
        password: 'password12345',
        name: 'Outsider',
      });
    expect(outsider.status).toBe(201);
    const outToken = outsider.body.data.accessToken as string;

    const spend = await request(app)
      .get(`/api/insights/spending?householdId=${householdId}`)
      .set('Authorization', `Bearer ${outToken}`);
    expect(spend.status).toBe(403);

    const stores = await request(app)
      .get(`/api/prices/stores?householdId=${householdId}`)
      .set('Authorization', `Bearer ${outToken}`);
    expect(stores.status).toBe(403);

    const createStore = await request(app)
      .post('/api/prices/stores')
      .set('Authorization', `Bearer ${outToken}`)
      .send({ name: 'Bad Store', householdId });
    expect(createStore.status).toBe(403);

    const missingHh = await request(app)
      .get('/api/insights/spending')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(missingHh.status).toBe(400);
  });

  it('garden AuthZ + harvest creates pantry item', async () => {
    const stamp = Date.now();
    const owner = await request(app)
      .post('/api/auth/register')
      .send({
        email: `garden-owner-${stamp}@example.com`,
        password: 'password12345',
        name: 'Garden Owner',
      });
    expect(owner.status).toBe(201);
    const ownerToken = owner.body.data.accessToken as string;

    const hh = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Garden-HH-${stamp}` });
    expect(hh.status).toBe(201);
    const householdId = hh.body.data.household.id as string;

    const outsider = await request(app)
      .post('/api/auth/register')
      .send({
        email: `garden-out-${stamp}@example.com`,
        password: 'password12345',
        name: 'Outsider',
      });
    expect(outsider.status).toBe(201);
    const outToken = outsider.body.data.accessToken as string;

    const forbidden = await request(app)
      .get(`/api/garden-sources?householdId=${householdId}`)
      .set('Authorization', `Bearer ${outToken}`);
    expect(forbidden.status).toBe(403);

    const source = await request(app)
      .post('/api/garden-sources')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        householdId,
        type: 'manual',
        name: 'Backyard',
      });
    expect(source.status).toBe(201);
    expect(source.body.data.source.hasFarmbotToken).toBe(false);
    expect(source.body.data.source.farmbotApiToken).toBeUndefined();
    const sourceId = source.body.data.source.id as string;

    const yieldRes = await request(app)
      .post('/api/garden-yields')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        householdId,
        gardenSourceId: sourceId,
        plantName: 'Basil',
        status: 'ready',
        estimatedYieldQty: 2,
        estimatedYieldUnit: 'bunch',
      });
    expect(yieldRes.status).toBe(201);
    const yieldId = yieldRes.body.data.yield.id as string;

    const harvest = await request(app)
      .post(`/api/garden-yields/${yieldId}/harvest`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    expect(harvest.status).toBe(200);
    expect(harvest.body.data.pantryItem.name).toMatch(/Basil/i);
    expect(harvest.body.data.yield.status).toBe('harvested');

    const pantry = await request(app)
      .get(`/api/pantry?householdId=${householdId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(pantry.status).toBe(200);
    expect(pantry.body.data.items.some((i: { name: string }) => /Basil/i.test(i.name))).toBe(true);
  });

  it('farmbot control AuthZ + confirm gate', async () => {
    const stamp = Date.now();
    const owner = await request(app)
      .post('/api/auth/register')
      .send({
        email: `fb-owner-${stamp}@example.com`,
        password: 'password12345',
        name: 'FB Owner',
      });
    expect(owner.status).toBe(201);
    const ownerToken = owner.body.data.accessToken as string;

    const hh = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `FB-HH-${stamp}` });
    expect(hh.status).toBe(201);
    const householdId = hh.body.data.household.id as string;

    const outsider = await request(app)
      .post('/api/auth/register')
      .send({
        email: `fb-out-${stamp}@example.com`,
        password: 'password12345',
        name: 'Outsider',
      });
    const outToken = outsider.body.data.accessToken as string;

    const source = await request(app)
      .post('/api/garden-sources')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        householdId,
        type: 'manual',
        name: 'Not FarmBot',
      });
    expect(source.status).toBe(201);
    const sourceId = source.body.data.source.id as string;

    const forbidden = await request(app)
      .get(`/api/garden-sources/${sourceId}/farmbot/status`)
      .set('Authorization', `Bearer ${outToken}`);
    expect(forbidden.status).toBe(403);

    const notFarmbot = await request(app)
      .get(`/api/garden-sources/${sourceId}/farmbot/status`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(notFarmbot.status).toBe(400);

    const payload = Buffer.from(
      JSON.stringify({
        iss: '//farmbot.kecktech.net:443',
        mqtt: 'farmbot.kecktech.net',
        bot: 'device_test',
        vhost: '/',
        exp: 9999999999,
      }),
    ).toString('base64url');
    const encoded = `hdr.${payload}.sig`;

    const fbSource = await request(app)
      .post('/api/garden-sources')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        householdId,
        type: 'farmbot',
        name: 'Express',
        farmbotApiToken: encoded,
      });
    expect(fbSource.status).toBe(201);
    const fbId = fbSource.body.data.source.id as string;
    expect(fbSource.body.data.source.farmbotApiToken).toBeUndefined();
    expect(fbSource.body.data.source.hasFarmbotToken).toBe(true);

    const missingConfirm = await request(app)
      .post(`/api/garden-sources/${fbId}/farmbot/estop`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    expect(missingConfirm.status).toBe(400);

    const statusOk = await request(app)
      .get(`/api/garden-sources/${fbId}/farmbot/status`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(statusOk.status).toBe(200);
    expect(statusOk.body.data.sourceId).toBe(fbId);
  });
});
