import db from '../config/firebase.js';

const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const getTicketActivity = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const snap = await db.collection('ticket_activity_logs')
      .where('ticket_id', '==', ticketId)
      .orderBy('created_at', 'desc')
      .get();
    
    res.json(snap.docs.map(doc => toObj(doc)));
  } catch (error) {
    console.error('Get ticket activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
