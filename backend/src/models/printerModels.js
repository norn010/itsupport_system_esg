import db from '../config/firebase.js';

const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

const timestamp = () => new Date();

export const Printer = {
  async create(data) {
    const docRef = await db.collection('printers').add({
      ...data,
      created_at: timestamp(),
      updated_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll() {
    const snap = await db.collection('printers').orderBy('created_at', 'desc').get();
    return snap.docs.map(doc => toObj(doc));
  },

  async findById(id) {
    const snap = await db.collection('printers').doc(id.toString()).get();
    if (!snap.exists) return null;
    return toObj(snap);
  },

  async update(id, updates) {
    const docRef = db.collection('printers').doc(id.toString());
    await docRef.update({
      ...updates,
      updated_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async delete(id) {
    await db.collection('printers').doc(id.toString()).delete();
  }
};

export const PrinterLog = {
  async create(data) {
    const { created_at, ...rest } = data;
    const logTime = created_at ? new Date(created_at) : timestamp();
    
    const docRef = await db.collection('printer_logs').add({
      ...rest,
      created_at: logTime,
      updated_at: logTime
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll() {
    const snap = await db.collection('printer_logs').orderBy('updated_at', 'desc').get();
    return snap.docs.map(doc => toObj(doc));
  },

  async findById(id) {
    const snap = await db.collection('printer_logs').doc(id.toString()).get();
    if (!snap.exists) return null;
    return toObj(snap);
  },

  async update(id, updates) {
    const { created_at, ...rest } = updates;
    const logTime = created_at ? new Date(created_at) : timestamp();

    const docRef = db.collection('printer_logs').doc(id.toString());
    
    // If created_at is provided, update both created_at and updated_at
    const updateData = { ...rest, updated_at: logTime };
    if (created_at) updateData.created_at = logTime;

    await docRef.update(updateData);
    const snap = await docRef.get();
    return toObj(snap);
  },

  async delete(id) {
    await db.collection('printer_logs').doc(id.toString()).delete();
  }
};
