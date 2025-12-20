// mongo-memory.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { exec } from 'child_process';

const FIXED_URI = 'mongodb://localhost:27017/misa';

const PORT = 27017;

function startMongoMemory() {
  console.log('Verificando si MongoDB Memory Server ya está en ejecución...');

  // Detener cualquier proceso en el puerto especificado (solo en Mac/Linux)
  exec(`lsof -ti :${PORT} | xargs kill -9`, (error, stdout, stderr) => {
    if (error) {
      console.warn(`No se encontró un proceso en el puerto ${PORT} o no se pudo detener: ${stderr}`);
    } else {
      console.log(`Proceso existente en el puerto ${PORT} detenido correctamente.`);
    }

    console.log('Iniciando nuevo MongoDB Memory Server en URI fija...');

    MongoMemoryServer.create({
      instance: {
        port: PORT, // Puerto fijo
        dbName: 'misa', // Nombre fijo de la base de datos
        ip: '127.0.0.1', // Host fijo (localhost)
        storageEngine: 'ephemeralForTest', // Motor de almacenamiento en memoria
      },
      binary: {
        version: '6.0.0', // Especifica la versión de MongoDB (opcional)
      },
    })
      .then(() => {
        console.log(`MongoDB Memory Server corriendo en: ${FIXED_URI}`);
        process.env.MONGO_HOST = FIXED_URI;
      })
      .catch((err) => {
        console.error('Error al iniciar MongoDB Memory Server:', err);
        process.exit(1);
      });
  });
}

function stopMongoMemory() {
  console.log(`Intentando detener cualquier proceso en el puerto ${PORT}...`);

  exec(`lsof -ti :${PORT} | xargs kill -9`, (error, stdout, stderr) => {
    if (error) {
      console.error(`No se pudo detener MongoDB Memory Server: ${stderr}`);
    } else {
      console.log(`MongoDB Memory Server detenido correctamente en el puerto ${PORT}.`);
    }
  });
}

const action = process.argv[2];

if (action === 'start') {
  startMongoMemory();
} else if (action === 'stop') {
  stopMongoMemory();
} else {
  console.error('Comando no reconocido. Usa "start" o "stop".');
  process.exit(1);
}
