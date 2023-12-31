const cron = require('node-cron');
const amqp = require('amqp-connection-manager');
const mongoose = require('mongoose');
const { File, Status } = require('./domain/File');
const dotenv = require('dotenv');

dotenv.config();

const connection = amqp.connect('amqp://rabbitmq');
const channelWrapper = connection.createChannel({ json: true });
const processQueue = 'process_file';

cron.schedule('*/10 * * * * *', async () => {
  console.log('running a task every 10 seconds');
  await mongoose.connect(process.env.MONGO);
  const files = await File.find({ status: Status.PENDING }).limit(5).exec();
  console.log({ files });
  files.forEach(async (file) => {
    const {
      id, status, path, name,
    } = file;
    const archive = {
      id, status, path, name,
    };
    await channelWrapper.sendToQueue(processQueue, archive);
    await File.findByIdAndUpdate(file.id, { status: Status.PROCESSING });
  });
});
