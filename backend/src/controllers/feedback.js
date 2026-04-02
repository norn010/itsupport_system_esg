import db from '../config/firebase.js';

const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const submitFeedback = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid rating between 1 and 5 is required' });
    }

    // Uniqueness check for ticketId
    const checkSnap = await db.collection('ticket_feedback').where('ticket_id', '==', ticketId).get();
    if (!checkSnap.empty) {
      return res.status(400).json({ message: 'Feedback already submitted for this ticket' });
    }

    const docRef = await db.collection('ticket_feedback').add({
      ticket_id: ticketId,
      rating: Number(rating),
      comment: comment || null,
      created_at: new Date()
    });
    
    const snap = await docRef.get();

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: toObj(snap)
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
