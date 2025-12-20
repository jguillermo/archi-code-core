import { MongoMemoryServer } from 'mongodb-memory-server';

export = async function globalSetup() {
  const instance = await MongoMemoryServer.create({
    instance: {
      port: global.__MONGO_PORT,
    },
  });
  (global as any).__MONGOINSTANCE = instance;

  const uri = new URL(instance.getUri());
  process.env.MONGO_HOST = `mongodb://${uri.host}/atsp-api`;
};
