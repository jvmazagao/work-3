const fs = require('fs');
const readline = require('readline');
const events = require('events');
const { File, Status } = require('../domain/File');

const fileProcessor = async (message) => {
  const { id: identifier, path, name } = message;
  console.log({ file: name, log: 'Starting to processing file' });
  const reader = readline.createInterface({
    input: fs.createReadStream(path),
    crlfDelay: Infinity,
  });
  const title = [];
  const atomList = [];

  reader.on('line', (l) => {
    const line = String(l);
    const ATOM = /^ATOM\s+\d+\s+\w+\s+\w+\s+\w+\s+-?\d+\s+-?\d+\.\d+\s+-?\d+\.\d+\s+-?\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+\s+\w+\s*$/;
    if (line.includes('TITLE')) {
      const parse = line.replace(/TITLE/, '');
      title.push(parse.replace(/\s+/, '').trim());
    }
    if (line.match(ATOM)) {
      const components = line.split(/\s+/);
      atomList.push({
        sequence: parseInt(components[1], 10),
        name: components[2],
        aminoAcid: components[3],
        chainIdentifier: components[4],
        chainNumber: parseInt(components[5], 10),
        x: parseFloat(components[6]),
        y: parseFloat(components[7]),
        z: parseFloat(components[8]),
        element: components[11],
      });
    }
  });

  await events.once(reader, 'close');
  console.log({ file: name, log: `Finish to read file with ${atomList.length} atoms`});
  return {
    title: title.join(' '),
    atoms: atomList,
  };
};

module.exports = { fileProcessor };
