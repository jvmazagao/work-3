const amqp = require('amqp-connection-manager');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const { File, Status } = require('./src/domain/File');
const { Molecule } = require('./src/domain/Molecule');
const { Atom } = require('./src/domain/Atom');
const { fileProcessor } = require('./src/processor/FileProcessor');

dotenv.config();
const connection = amqp.connect('amqp://localhost');
const channelWrapper = connection.createChannel({ json: true });

const queue = 'process_file';
const atomsQueue = 'process_atoms';
console.log(`>> Listening ${queue}...`);

const processor = async (message) => {
  await mongoose.connect(process.env.MONGO);
  const messageContent = JSON.parse(message.content.toString('utf8'));

  const { name, id: identifier } = messageContent;
  const { title, atoms } = await fileProcessor(messageContent);

  console.log({ file: name, log: 'Starting to process element - 3' });

  const storedElement = await Molecule.findById({ _id: title }).exec();

  if (!storedElement) {
    console.log({ file: name, log: 'Element not stored.' });
    try {
      const mol = new Molecule({ _id: title });
      await mol.save();
      console.log({ file: name, log: 'Send to atom consumer' });
      atoms.forEach((atom) => {
        channelWrapper.sendToQueue(atomsQueue, { ...atom, molecule_id: title });
      });
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
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-2' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-3' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-4' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-5' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-6' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-7' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-9' });
channelWrapper.consume(queue, processor, { noAck: true, consumerTag: 'file-consumer-10' });

const processAtom = async (message) => {
  await mongoose.connect(process.env.MONGO);
  const atom = JSON.parse(message.content.toString('utf8'));
  const at = new Atom({ ...atom });
  await at.save();
};

channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-' });
channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-2' });
channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-3' });
channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-4' });
channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-5' });
channelWrapper.consume(atomsQueue, processAtom, { noAck: true, consumerTag: 'atom-consumer-6' });
