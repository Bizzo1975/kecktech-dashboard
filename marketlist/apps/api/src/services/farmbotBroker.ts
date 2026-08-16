import mqtt, { MqttClient } from 'mqtt';
import { Op } from 'sequelize';
import { GardenSource, GardenYieldEvent } from '../models';
import {
  FarmBotTokenClaims,
  mapFarmBotPointToYield,
  parseFarmBotTokenInput,
  type FarmBotPlantPoint,
} from './farmbot';
import { decryptSecret } from './tokenCrypto';

type ActiveSub = {
  sourceId: string;
  client: MqttClient;
  bot: string;
};

const active = new Map<string, ActiveSub>();

const applyPointUpdate = async (
  source: GardenSource,
  point: FarmBotPlantPoint | null,
  resourceId: string,
) => {
  if (!point) {
    // Deleted on FarmBot — remove non-harvested local rows
    await GardenYieldEvent.destroy({
      where: {
        gardenSourceId: source.id,
        farmbotPlantId: resourceId,
        status: { [Op.ne]: 'harvested' },
      },
    });
    return;
  }

  const mapped = mapFarmBotPointToYield(point);
  if (!mapped) {
    await GardenYieldEvent.destroy({
      where: {
        gardenSourceId: source.id,
        farmbotPlantId: resourceId,
        status: { [Op.ne]: 'harvested' },
      },
    });
    return;
  }

  const existing = await GardenYieldEvent.findOne({
    where: { gardenSourceId: source.id, farmbotPlantId: mapped.farmbotPlantId },
  });

  if (existing) {
    if (existing.status === 'harvested' && mapped.status !== 'harvested') {
      return;
    }
    await existing.update({
      plantName: mapped.plantName,
      status:
        mapped.status === 'harvested'
          ? 'harvested'
          : existing.status === 'ready'
            ? 'ready'
            : mapped.status,
      expectedHarvestStart: mapped.expectedHarvestStart,
      expectedHarvestEnd: mapped.expectedHarvestEnd,
    });
    return;
  }

  if (mapped.status === 'harvested') return;

  await GardenYieldEvent.create({
    householdId: source.householdId,
    gardenSourceId: source.id,
    plantName: mapped.plantName,
    expectedHarvestStart: mapped.expectedHarvestStart,
    expectedHarvestEnd: mapped.expectedHarvestEnd,
    estimatedYieldQty: null,
    estimatedYieldUnit: null,
    status: mapped.status,
    farmbotPlantId: mapped.farmbotPlantId,
    harvestedPantryItemId: null,
  });
};

const connectSource = (source: GardenSource, claims: FarmBotTokenClaims) => {
  const existing = active.get(source.id);
  if (existing) {
    existing.client.end(true);
    active.delete(source.id);
  }

  const url = `mqtts://${claims.mqtt}:8883`;
  const client = mqtt.connect(url, {
    username: claims.bot,
    password: claims.encoded,
    clientId: `marketlist_${source.id.slice(0, 8)}_${Date.now()}`,
    clean: true,
    reconnectPeriod: 10_000,
    connectTimeout: 30_000,
    protocolVersion: 4,
    // FarmBot CloudAMQP uses vhost
    ...(claims.vhost ? { protocolId: 'MQTT' as const } : {}),
  });

  // mqtt.js uses path-style for AMQP: username may need vhost — FarmBot docs:
  // username = bot claim, password = encoded token. Some brokers want username as vhost:bot.
  // Official FarmBot examples use bot as username directly.

  const topic = `bot/${claims.bot}/sync/Point/#`;

  client.on('connect', () => {
    client.subscribe(topic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`[farmbot-broker] subscribe failed source=${source.id}`, err.message);
      }
    });
  });

  client.on('message', (msgTopic, payload) => {
    void (async () => {
      try {
        const parts = msgTopic.split('/');
        // bot/device_X/sync/Point/ID
        const resourceId = parts[parts.length - 1];
        if (!resourceId || resourceId === '#') return;
        const parsed = JSON.parse(payload.toString('utf8')) as { body?: FarmBotPlantPoint | null };
        const fresh = await GardenSource.findByPk(source.id);
        if (!fresh || fresh.type !== 'farmbot') return;
        await applyPointUpdate(fresh, parsed.body ?? null, resourceId);
        await fresh.update({ lastSyncedAt: new Date() });
      } catch (err) {
        console.error(`[farmbot-broker] message error source=${source.id}`, err);
      }
    })();
  });

  client.on('error', (err) => {
    console.error(`[farmbot-broker] error source=${source.id}`, err.message);
  });

  active.set(source.id, { sourceId: source.id, client, bot: claims.bot });
};

export const stopFarmBotBroker = (sourceId: string) => {
  const sub = active.get(sourceId);
  if (!sub) return;
  sub.client.end(true);
  active.delete(sourceId);
};

export const startFarmBotBrokerForSource = async (source: GardenSource) => {
  if (source.type !== 'farmbot' || !source.farmbotApiToken) {
    stopFarmBotBroker(source.id);
    return;
  }
  try {
    const plain = decryptSecret(source.farmbotApiToken);
    const claims = parseFarmBotTokenInput(plain);
    connectSource(source, claims);
  } catch (err) {
    console.error(`[farmbot-broker] failed to start source=${source.id}`, err);
    stopFarmBotBroker(source.id);
  }
};

/** Resume MQTT for all FarmBot sources that have tokens (call on API boot). */
export const bootstrapFarmBotBrokers = async () => {
  const sources = await GardenSource.findAll({ where: { type: 'farmbot' } });
  for (const source of sources) {
    if (!source.farmbotApiToken) continue;
    await startFarmBotBrokerForSource(source);
  }
  console.log(`[farmbot-broker] bootstrapped ${active.size} subscription(s)`);
};

export const farmBotBrokerActiveCount = () => active.size;
