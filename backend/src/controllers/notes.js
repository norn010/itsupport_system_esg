import db from '../config/firebase.js';

const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const getNotes = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const snap = await db.collection('ticket_internal_notes')
      .where('ticket_id', '==', ticketId)
      .orderBy('created_at', 'desc')
      .get();
    
    const notes = await Promise.all(snap.docs.map(async (doc) => {
      const n = toObj(doc);
      if (n.created_by) {
        const userSnap = await db.collection('users').doc(n.created_by.toString()).get();
        if (userSnap.exists) {
          n.author_name = userSnap.data().full_name;
          n.author_role = userSnap.data().role;
        }
      }
      return n;
    }));
    
    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNote = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { note } = req.body;
    
    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const docRef = await db.collection('ticket_internal_notes').add({
      ticket_id: ticketId,
      note: note.trim(),
      created_by: req.user.id,
      created_at: new Date()
    });
    const snap = await docRef.get();
    
    res.status(201).json({
      message: 'Note added successfully',
      note: toObj(snap)
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('ticket_internal_notes').doc(id);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const noteRecord = snap.data();
    if (noteRecord.created_by !== req.user.id && req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await docRef.delete();
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
