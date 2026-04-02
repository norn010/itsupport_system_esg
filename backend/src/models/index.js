import db from '../config/firebase.js';

// Helper to convert Firestore doc to regular object with id
const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// Helper for createdAt/updatedAt
const timestamp = () => new Date();

export const Ticket = {
  async create(data) {
    const docRef = db.collection('tickets').doc(data.ticket_id);
    const docData = {
      ...data,
      status: data.status || 'Open',
      created_at: timestamp(),
      updated_at: timestamp(),
    };
    await docRef.set(docData);
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll({ status, priority, search, limit = 50, offset = 0 }) {
    let query = db.collection('tickets');

    if (status) query = query.where('status', '==', status);
    if (priority) query = query.where('priority', '==', priority);

    const snapshot = await query.orderBy('created_at', 'desc').get();
    let tickets = snapshot.docs.map(doc => toObj(doc));

    if (search) {
      const lowerSearch = search.toLowerCase();
      tickets = tickets.filter(t => 
        (t.ticket_id && t.ticket_id.toLowerCase().includes(lowerSearch)) ||
        (t.issue_title && t.issue_title.toLowerCase().includes(lowerSearch))
      );
    }

    // Handle offset and limit (Firestore doesn't have offset easily, so manually slicing)
    const resultTickets = tickets.slice(offset, offset + limit);

    // Resolve related data (Denormalization/Simulated Joins)
    const enrichedTickets = await Promise.all(resultTickets.map(async (t) => {
      if (t.assigned_to) {
        const userSnap = await db.collection('users').doc(t.assigned_to.toString()).get();
        if (userSnap.exists) {
          const userData = userSnap.data();
          t.assigned_username = userData.username;
          t.assigned_name = userData.full_name;
        }
      }
      if (t.category_id) {
        const catSnap = await db.collection('categories').doc(t.category_id.toString()).get();
        if (catSnap.exists) t.category_name = catSnap.data().name;
      }
      if (t.subcategory_id) {
        const subCatSnap = await db.collection('subcategories').doc(t.subcategory_id.toString()).get();
        if (subCatSnap.exists) t.subcategory_name = subCatSnap.data().name;
      }
      return t;
    }));

    return enrichedTickets;
  },

  async findById(id) {
    // Note: 'id' here might refer to Firestore auto ID or the ticket_id?
    // Based on original query 't.id = $1', it looks like the internal DB index.
    // Let's check both or assume id is the document name if we use custom IDs.
    const snapshot = await db.collection('tickets').doc(id.toString()).get();
    if (!snapshot.exists) return null;
    const t = toObj(snapshot);

    // Resolve related data
    if (t.assigned_to) {
      const userSnap = await db.collection('users').doc(t.assigned_to.toString()).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        t.assigned_username = userData.username;
        t.assigned_name = userData.full_name;
      }
    }
    if (t.category_id) {
      const catSnap = await db.collection('categories').doc(t.category_id.toString()).get();
      if (catSnap.exists) t.category_name = catSnap.data().name;
    }
    if (t.subcategory_id) {
      const subCatSnap = await db.collection('subcategories').doc(t.subcategory_id.toString()).get();
      if (subCatSnap.exists) t.subcategory_name = subCatSnap.data().name;
    }
    if (t.asset_id) {
      const assetSnap = await db.collection('assets').doc(t.asset_id.toString()).get();
      if (assetSnap.exists) {
        const ad = assetSnap.data();
        t.asset_code = ad.asset_code;
        t.asset_name = ad.name;
        t.asset_brand = ad.brand;
        t.asset_model = ad.model;
        t.asset_serial = ad.serial_number;
      }
    }
    
    // Feedback
    const feedbackSnap = await db.collection('ticket_feedback').where('ticket_id', '==', t.ticket_id).get();
    if (!feedbackSnap.empty) {
      const fb = feedbackSnap.docs[0].data();
      t.feedback_rating = fb.rating;
      t.feedback_comment = fb.comment;
    }

    return t;
  },

  async findByTicketId(ticketId) {
    const snap = await db.collection('tickets').doc(ticketId).get();
    if (snap.exists) return this.findById(ticketId); // reuse logic
    
    // If ticket_id is just a field and not the doc ID:
    const querySnap = await db.collection('tickets').where('ticket_id', '==', ticketId).get();
    if (querySnap.empty) return null;
    return this.findById(querySnap.docs[0].id);
  },

  async update(id, updates) {
    const docRef = db.collection('tickets').doc(id.toString());
    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
    });
    
    await docRef.update({
      ...cleanUpdates,
      updated_at: timestamp()
    });
    return this.findById(id);
  },

  async getDepartments() {
    const snap = await db.collection('tickets').get();
    const depts = new Set();
    snap.forEach(doc => {
      const d = doc.data().department;
      if (d) depts.add(d);
    });
    return Array.from(depts).sort().map(d => ({ department: d }));
  },

  async getStats() {
    const ticketsSnap = await db.collection('tickets').get();
    const tickets = ticketsSnap.docs.map(doc => doc.data());

    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'Open').length,
      in_progress: tickets.filter(t => t.status === 'In Progress').length,
      resolved: tickets.filter(t => t.status === 'Resolved').length,
      closed: tickets.filter(t => t.status === 'Closed').length
    };

    // Daily stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyMap = {};
    tickets.forEach(t => {
      const date = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at);
      if (date >= thirtyDaysAgo) {
        const dateStr = date.toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
      }
    });
    const daily = Object.keys(dailyMap).sort().map(date => ({ date, count: dailyMap[date] }));

    // By staff
    const usersSnap = await db.collection('users').where('role', '==', 'IT').get();
    const byStaff = await Promise.all(usersSnap.docs.map(async (doc) => {
      const user = doc.data();
      const countSnap = await db.collection('tickets').where('assigned_to', '==', doc.id).get();
      return { full_name: user.full_name, ticket_count: countSnap.size };
    }));

    // By category
    const catsSnap = await db.collection('categories').get();
    const byCategory = await Promise.all(catsSnap.docs.map(async (doc) => {
      const cat = doc.data();
      const countSnap = await db.collection('tickets').where('category_id', '==', doc.id).get();
      return { name: cat.name, value: countSnap.size };
    }));

    // By department (branch)
    const deptMap = {};
    tickets.forEach(t => {
      const dept = t.department || 'ไม่ระบุ';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const byDepartment = Object.entries(deptMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      overview: stats,
      daily,
      byStaff,
      byCategory,
      byDepartment,
    };
  }
};

export const TicketImage = {
  async create(ticketId, filePath) {
    const docRef = await db.collection('ticket_images').add({
      ticket_id: ticketId,
      file_path: filePath,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findByTicketId(ticketId) {
    const snap = await db.collection('ticket_images').where('ticket_id', '==', ticketId).get();
    return snap.docs.map(doc => toObj(doc));
  }
};

export const ChatMessage = {
  async create(data) {
    const docRef = await db.collection('chat_messages').add({
      ...data,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findByTicketId(ticketId) {
    const snap = await db.collection('chat_messages')
      .where('ticket_id', '==', ticketId)
      .orderBy('created_at', 'asc')
      .get();
    
    const messages = await Promise.all(snap.docs.map(async (doc) => {
      const m = toObj(doc);
      if (m.user_id) {
        const userSnap = await db.collection('users').doc(m.user_id.toString()).get();
        if (userSnap.exists) m.staff_name = userSnap.data().full_name;
      }
      return m;
    }));
    return messages;
  }
};

export const User = {
  async findByUsername(username) {
    const snap = await db.collection('users').where('username', '==', username).get();
    if (snap.empty) return null;
    return toObj(snap.docs[0]);
  },

  async findById(id) {
    const snap = await db.collection('users').doc(id.toString()).get();
    if (!snap.exists) return null;
    const u = snap.data();
    return { id, username: u.username, role: u.role, email: u.email, full_name: u.full_name, created_at: u.created_at };
  },

  async create(data) {
    const docRef = db.collection('users').doc(data.username);
    await docRef.set({
      ...data,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll() {
    const snap = await db.collection('users').get();
    return snap.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      return { id: doc.id, ...data };
    });
  },

  async delete(id) {
    await db.collection('users').doc(id.toString()).delete();
  },

  async findAllITStaff() {
    const snap = await db.collection('users').where('role', 'in', ['IT', 'MANAGER']).get();
    return snap.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      full_name: doc.data().full_name,
      role: doc.data().role,
      email: doc.data().email
    }));
  }
};

export const Category = {
  async findAll() {
    const snap = await db.collection('categories').get();
    const categories = snap.docs.map(doc => toObj(doc))
      .filter(c => c && c.is_active !== false); // Default to true if missing or true
    return categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  async findSubcategories(categoryId) {
    if (!categoryId) return [];
    const snap = await db.collection('subcategories')
      .where('category_id', '==', categoryId).get();
    const subcategories = snap.docs.map(doc => toObj(doc))
      .filter(sc => sc && sc.is_active !== false);
    return subcategories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  async findOrCreateByName(name) {
    if (!name) return null;
    let snap = await db.collection('categories').where('name', '==', name).get();
    if (!snap.empty) return toObj(snap.docs[0]);

    const docRef = await db.collection('categories').add({
      name,
      is_active: true,
      created_at: timestamp()
    });
    const newSnap = await docRef.get();
    return toObj(newSnap);
  },

  async findOrCreateSubcategoryByName(categoryId, name) {
    if (!name || !categoryId) return null;
    let snap = await db.collection('subcategories')
      .where('category_id', '==', categoryId)
      .where('name', '==', name).get();
    if (!snap.empty) return toObj(snap.docs[0]);

    const docRef = await db.collection('subcategories').add({
      category_id: categoryId,
      name,
      is_active: true,
      created_at: timestamp()
    });
    const newSnap = await docRef.get();
    return toObj(newSnap);
  }
};

export const UserNotification = {
  async create(data) {
    const docRef = await db.collection('user_notifications').add({
      ...data,
      is_read: false,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findByUserId(userId) {
    const snap = await db.collection('user_notifications')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();
    return snap.docs.map(doc => toObj(doc));
  },

  async markAsRead(notificationId, userId) {
    await db.collection('user_notifications').doc(notificationId).update({ is_read: true });
  },

  async markAllAsRead(userId) {
    const snap = await db.collection('user_notifications')
      .where('user_id', '==', userId)
      .where('is_read', '==', false).get();
    
    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { is_read: true }));
    await batch.commit();
  }
};
