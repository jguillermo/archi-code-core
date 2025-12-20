export default () => ({
  mongo: {
    host: process.env.MONGO_HOST || 'mongodb://localhost:27017/misa',
  },
});
