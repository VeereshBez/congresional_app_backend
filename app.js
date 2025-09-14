const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser')
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const nodemailer = require('nodemailer');

const axios = require('axios')

const app = express();
const upload = multer({ dest: 'uploads/' }); // temp folder

app.use(cors());
app.use(express.json());

app.use(bodyParser.json());  // or: app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
var admin = require("firebase-admin");
app.use(express.static(path.join(__dirname, 'public')));

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://congressional-app-7fd62-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function getDocuments() {
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}



// Create transporter
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'veeresh.bezawada09@gmail.com', // your Gmail address
        pass: 'gdou xoom krpb hwqe'  // 16-char App Password
    }
});



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

app.get('/', (req, res) => {
  res.send("wassup")
})

async function updateDocById(collectionName, docId, updateData) {
  const docRef = db.collection(collectionName).doc(docId);
  
  const docSnapshot = await docRef.get();
  if (!docSnapshot.exists) {
    console.log('No such document!');
    return;
  }

  await docRef.update(updateData);
  console.log(`Document ${docId} updated successfully.`);
}

app.get('/activeAccount/:id', async (req, res) => {
	await updateDocById('users', req.params.id, {active: true})
	res.sendFile(path.join(__dirname, 'public/activeAccount.html'));
})


app.post('/upload', upload.single('file'), async (req, res) => {
  const tempPath = req.file.path;

  try {
    const result = await cloudinary.uploader.upload(tempPath, {
      folder: 'congressional_app',
    });

    fs.unlinkSync(tempPath); // Clean up
    res.status(200).send(result.secure_url);
  } catch (err) {
    console.error('Upload error:', err);
    fs.unlinkSync(tempPath);
    res.status(500).send('Upload failed');
  }
});

app.post('/sendEmail', (req, res) => {
	let mailOptions = {
	    from: 'veeresh.bezawada09@gmail.com',
	    to: req.body.email, // your test email
	    subject: 'Password Reset For Civic Spot',
	    text: 'Password reset token: ' + req.body.token
	};

	transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        res.send('Error: ' + error)
    } else {
        res.send('Success')
    }
});
})

app.post('/verificationEmail', (req, res) => {
	let mailOptions = {
	    from: 'CivicSpot',
	    to: req.body.email, // your test email
	    subject: 'Account Verification',
	    html: `<p>Thanks for registering! Click </p><p> <a href="https://congresional-app-backend.onrender.com/activeAccount/${req.body.id}">Here</a> To intialize your account!<p>`
	};

	transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        res.send('Error: ' + error)
    } else {
        res.send('Success')
    }
});
})


app.listen(3000, () => {
  console.log('Server has started');
});
