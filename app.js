const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser')
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const axios = require('axios')

const app = express();
const upload = multer({ dest: 'uploads/' }); // temp folder

app.use(cors());
app.use(express.json());

app.use(bodyParser.json());  // or: app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));


cloudinary.config({
  cloud_name: 'dpf0guhzt',
  api_key: '936645566537438',
  api_secret: 'GX9Rciq5nlBTewYYdd6aZlz0HQ8',
});

const crypto = require('crypto');

async function deleteAllImages() {
  try {
    let nextCursor = null;

    do {
      // List resources (max 100 per call)
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: 100,
        next_cursor: nextCursor,
      });

      const publicIds = result.resources.map((r) => r.public_id);

      if (publicIds.length === 0) break;

      // Delete images in bulk
      const deleteResult = await cloudinary.api.delete_resources(publicIds);
      console.log('Deleted:', deleteResult.deleted);

      nextCursor = result.next_cursor;
    } while (nextCursor);

    console.log('All images deleted!');
  } catch (err) {
    console.error('Error deleting images:', err);
  }
}

deleteAllImages();

app.post('/upload', async (req, res) => {
  const uri = req.body.uri;

  if (!uri) return res.status(400).send('No URI provided');

  // Generate unique temp filename
  const tempPath = path.join(__dirname, `temp_${crypto.randomBytes(8).toString('hex')}.jpg`);

  try {
    const response = await axios.get(uri, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    // Save file
    fs.writeFileSync(tempPath, buffer);

    const result = await cloudinary.uploader.upload(tempPath, {
      folder: 'congressional_app',
    });

    // Delete temp file if exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    res.status(200).send(result.secure_url);
  } catch (err) {
    console.error(err);
    // Attempt to clean up temp file on error too
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    res.status(500).send('Upload failed');
  }
});


app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
