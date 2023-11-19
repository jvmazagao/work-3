const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dotenv = require('dotenv')
const { File, Status } = require('./domain/File');
dotenv.config();

const exec = async () => {
    await mongoose.connect(process.env.MONGO);
    const folderPath = path.resolve(__dirname, 'archives'); // Replace with the path to your archive folder
    const files = fs.readdirSync(folderPath);

    const stores = files.map(async (file) => {
      const path = folderPath.concat(`/${file}`);

      const storedArchive = await File.findOne({ name: file }).exec();
      
      if (!storedArchive) {
        console.log({ file, log: 'Creating register' });
        const archive = new File({ name: file, path, status: Status.PENDING });
        return archive.save();
      }

      console.log({ file: file, log: 'Archive stored' });
    });
    await Promise.all(stores);
    process.exit(0);
};

exec();