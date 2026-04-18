import db from '../config/firebase.js';

const timestamp = () => new Date();
const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const getLocations = async (req, res) => {
  try {
    const snap = await db.collection('locations').get();
    const locations = snap.docs
      .map(doc => toObj(doc))
      .filter(l => l && l.name && l.is_active !== false)
      .sort((a, b) => {
        const nameA = String(a.name || '').trim();
        const nameB = String(b.name || '').trim();
        return nameA.localeCompare(nameB, 'th');
      });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching locations' });
  }
};

export const createLocation = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Location name is required' });
    }
    // Check duplicate
    const existing = await db.collection('locations').where('name', '==', name.trim()).get();
    if (!existing.empty) {
      return res.status(400).json({ message: 'Location already exists' });
    }
    const docRef = await db.collection('locations').add({
      name: name.trim(),
      is_active: true,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    res.status(201).json(toObj(snap));
  } catch (error) {
    res.status(500).json({ message: 'Error creating location' });
  }
};
