import {
  estimateHarvestWindow,
  mapFarmBotPointToYield,
  mapPlantStageToStatus,
  parseFarmBotTokenInput,
} from '../services/farmbot';
import {
  buildRpcEnvelopeForTest,
  celeryHelpersForTest,
} from '../services/farmbotControl';
import { decryptSecret, encryptSecret } from '../services/tokenCrypto';
import {
  farmbotConfirmSchema,
  farmbotHomeSchema,
  farmbotMoveSchema,
  createFarmbotPlantPointSchema,
} from '@marketlist/shared';

describe('farmbot mapping', () => {
  it('maps plant stages to Marketlist statuses', () => {
    expect(mapPlantStageToStatus('planned')).toBe('planted');
    expect(mapPlantStageToStatus('planted')).toBe('growing');
    expect(mapPlantStageToStatus('sprouted')).toBe('ready');
    expect(mapPlantStageToStatus('harvested')).toBe('harvested');
  });

  it('maps Plant points and skips weeds', () => {
    const plant = mapFarmBotPointToYield({
      id: 42,
      name: 'Basil',
      pointer_type: 'Plant',
      plant_stage: 'sprouted',
      planted_at: '2026-01-01T00:00:00.000Z',
    });
    expect(plant?.farmbotPlantId).toBe('42');
    expect(plant?.status).toBe('ready');
    expect(plant?.expectedHarvestStart).toBeTruthy();

    const weed = mapFarmBotPointToYield({
      id: 9,
      name: 'Weed',
      pointer_type: 'Weed',
    });
    expect(weed).toBeNull();
  });

  it('estimates harvest window from planted_at', () => {
    const window = estimateHarvestWindow('2026-01-01');
    expect(window.start).toBe('2026-02-15');
    expect(window.end).toBe('2026-03-17');
  });

  it('parses encoded JWT claims for mqtt/bot', () => {
    const payload = Buffer.from(
      JSON.stringify({
        iss: '//my.farm.bot:443',
        mqtt: 'example.rmq.cloudamqp.com',
        bot: 'device_99',
        vhost: 'vh',
        exp: 9999999999,
      }),
    ).toString('base64url');
    const encoded = `hdr.${payload}.sig`;
    const claims = parseFarmBotTokenInput(encoded);
    expect(claims.bot).toBe('device_99');
    expect(claims.mqtt).toBe('example.rmq.cloudamqp.com');
    expect(claims.iss).toContain('my.farm.bot');
    expect(claims.encoded).toBe(encoded);
  });

  it('parses self-hosted FarmBot JWT claims', () => {
    const payload = Buffer.from(
      JSON.stringify({
        iss: '//farmbot.kecktech.net:443',
        mqtt: 'farmbot.kecktech.net',
        bot: 'device_7',
        vhost: '/',
        exp: 9999999999,
      }),
    ).toString('base64url');
    const encoded = `hdr.${payload}.sig`;
    const claims = parseFarmBotTokenInput(encoded);
    expect(claims.bot).toBe('device_7');
    expect(claims.mqtt).toBe('farmbot.kecktech.net');
    expect(claims.iss).toContain('farmbot.kecktech.net');
  });
});

describe('tokenCrypto', () => {
  it('round-trips secrets', () => {
    const plain = 'secret-farmbot-token-value';
    const enc = encryptSecret(plain);
    expect(enc.startsWith('v1:')).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });
});

describe('farmbot control CeleryScript', () => {
  it('builds rpc_request envelope with label', () => {
    const inner = celeryHelpersForTest.emergencyLockNode();
    const envelope = buildRpcEnvelopeForTest(inner, 'test-label-1');
    expect(envelope.kind).toBe('rpc_request');
    expect(envelope.args.label).toBe('test-label-1');
    expect(envelope.body?.[0]?.kind).toBe('emergency_lock');
  });

  it('builds execute and move_absolute nodes', () => {
    expect(celeryHelpersForTest.execSequenceNode(12).args.sequence_id).toBe(12);
    const move = celeryHelpersForTest.moveAbsoluteNode(100, 200, 0, 80);
    expect(move.kind).toBe('move_absolute');
    expect(move.args.speed).toBe(80);
    const location = move.args.location as {
      kind: string;
      args: { x: number; y: number; z: number };
    };
    expect(location.args.x).toBe(100);
    expect(location.args.y).toBe(200);
  });
});

describe('farmbot shared schemas', () => {
  it('requires confirm: true', () => {
    expect(farmbotConfirmSchema.safeParse({ confirm: true }).success).toBe(true);
    expect(farmbotConfirmSchema.safeParse({ confirm: false }).success).toBe(false);
    expect(farmbotConfirmSchema.safeParse({}).success).toBe(false);
  });

  it('validates home and move payloads', () => {
    expect(farmbotHomeSchema.safeParse({ confirm: true, axis: 'x' }).success).toBe(true);
    expect(farmbotMoveSchema.safeParse({ confirm: true, x: 1, y: 2, z: 3 }).success).toBe(true);
    expect(farmbotMoveSchema.safeParse({ confirm: true, x: 1 }).success).toBe(false);
  });

  it('validates plant point create', () => {
    expect(
      createFarmbotPlantPointSchema.safeParse({ name: 'Lettuce', x: 10, y: 20 }).success,
    ).toBe(true);
  });
});
