const amqp = require('amqp-connection-manager');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { File, Status } = require('./src/domain/File');
const { Molecule } = require('./src/domain/Molecule');
const { Atom } = require('./src/domain/Atom');
const { fileProcessor } = require('./src/processor/FileProcessor');

dotenv.config();
const connection = amqp.connect('amqp://rabbitmq');
const channelWrapper = connection.createChannel({ json: true });

const queue = 'process_file';
const atomsQueue = 'process_atoms';
console.log(`>> Listening ${queue}...`);

const processor = async (message) => {
  await mongoose.connect(process.env.MONGO);
  const messageContent = JSON.parse(message.content.toString('utf8'));

  const { name, id: identifier } = messageContent;
  const folderPath = path.resolve(__dirname, 'archives');
  const { title, atoms } = await fileProcessor({ ...messageContent, folderPath });

  console.log({ file: name, log: 'Starting to process element' });

  const storedElement = await Molecule.findById({ _id: title }).exec();

  if (!storedElement) {
    console.log({ file: name, log: 'Element not stored.' });
    try {
      const mol = new Molecule({ _id: title });
      await mol.save();
      console.log({ file: name, log: 'Send to atom consumer' });
      const ats = atoms.map((atom) => ({ ...atom, molecule_id: title }));
      await channelWrapper.sendToQueue(atomsQueue, ats);
      console.log({ file: name, log: 'Element stored' });
      await File.findByIdAndUpdate(identifier, { status: Status.PROCESSED });
      console.log({ file: identifier, log: 'Processed' });
    } catch (err) {
      console.log({ message: err.message });
      await File.findByIdAndUpdate(identifier, { status: Status.ERROR });
    }
  }
};

channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-1' });

const processAtom = async (message) => {
  const messageContent = JSON.parse(message.content.toString());
  await mongoose.connect(process.env.MONGO);
  await Atom.insertMany(messageContent);
  console.log({ log: 'Atoms stored'})
};

channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-1' });
