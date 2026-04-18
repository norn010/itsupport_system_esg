import db from '../config/firebase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const timestamp = () => new Date();
const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// Ensure rack_photos upload directory exists
const rackUploadDir = path.join(__dirname, '../../uploads/rack_photos');
if (!fs.existsSync(rackUploadDir)) {
  fs.mkdirSync(rackUploadDir, { recursive: true });
}

export const getRackPhotos = async (req, res) => {
  try {
    const snap = await db.collection('rack_photos').get();
    const photos = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0);
        const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0);
        return dateB - dateA;
      });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rack photos' });
  }
};

export const createRackPhoto = async (req, res) => {
  try {
    const { location_id, location_name, recorded_by, date, image_data, image_name } = req.body;

    if (!location_name || !recorded_by) {
      return res.status(400).json({ message: 'Location and recorded_by are required' });
    }

    // Save base64 image to disk instead of storing in Firestore (>1MB limit)
    let file_path = null;
    if (image_data && image_name) {
      // Strip the data URI prefix: "data:image/png;base64,xxxx"
      const matches = image_data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = image_name.split('.').pop() || 'jpg';
        const savedName = `rack_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const savedPath = path.join(rackUploadDir, savedName);
        fs.writeFileSync(savedPath, buffer);
        file_path = `/uploads/rack_photos/${savedName}`;
      }
    }

    const docRef = await db.collection('rack_photos').add({
      location_id: location_id || null,
      location_name,
      recorded_by,
      date: date || new Date().toISOString().split('T')[0],
      file_path,          // store only the path, NOT the base64 blob
      image_name: image_name || null,
      created_at: timestamp(),
      created_by: req.user?.username || null
    });

    const snap = await docRef.get();
    res.status(201).json(toObj(snap));
  } catch (error) {
    console.error('Error creating rack photo:', error);
    res.status(500).json({ message: 'Error saving rack photo' });
  }
};
