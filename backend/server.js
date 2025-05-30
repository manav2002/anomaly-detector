import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import alertRoutes from './routes/alertRoutes.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


dotenv.config();

const baseURL = process.env.VITE_API_URL

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // add this!

app.use('/alerts', alertRoutes);

const PORT = process.env.PORT || 4000;

// Ensure /frames directory exists
const framesDir = path.join(process.cwd(), 'frames');
if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir);
}

// Configure multer for saving image files
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, framesDir),
    filename: (req, file, cb) => cb(null, file.originalname),
  }),
});

// Route to accept frame uploads
app.post('/upload-frame', upload.single('frame'), (req, res) => {
  const filename = req.file.originalname;
  // const imageUrl = `/frames/${filename}`;
  // const imageUrl = `http://localhost:4000/frames/${filename}`;
  const imageUrl = `${baseURL}/frames/${filename}`;

  console.log(`🖼️ Saved frame: ${filename}`);
  res.json({ imageUrl });
});

// Serve frames as static files
app.use('/frames', express.static(framesDir));



app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running`);
});

