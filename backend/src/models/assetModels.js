import db, { FieldValue } from '../config/firebase.js';

// Helper to convert Firestore doc to regular object with id
const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

const timestamp = () => new Date();

// ===========================================================================
// ASSET MODEL
// ===========================================================================
export const Asset = {
  async create(data) {
    const docData = { ...data };
    if (typeof docData.purchase_date === 'string') docData.purchase_date = new Date(docData.purchase_date);
    if (typeof docData.warranty_expiry === 'string') docData.warranty_expiry = new Date(docData.warranty_expiry);

    const docRef = await db.collection('assets').add({
      ...docData,
      status: docData.status || 'Available',
      created_at: timestamp(),
      updated_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll({ status, category_id, location_id, search, limit = 50, offset = 0 }) {
    let query = db.collection('assets');

    if (status) query = query.where('status', '==', status);
    if (category_id) query = query.where('category_id', '==', category_id.toString());
    if (location_id) query = query.where('location_id', '==', location_id.toString());

    const snapshot = await query.orderBy('created_at', 'desc').get();
    let assets = snapshot.docs.map(doc => toObj(doc));

    if (search) {
      const ls = search.toLowerCase();
      assets = assets.filter(a => 
        (a.asset_code && a.asset_code.toLowerCase().includes(ls)) ||
        (a.name && a.name.toLowerCase().includes(ls)) ||
        (a.serial_number && a.serial_number.toLowerCase().includes(ls))
      );
    }

    const resultAssets = assets.slice(offset, offset + limit);

    // Simulated Joins
    return await Promise.all(resultAssets.map(async (a) => {
      if (a.category_id) {
        const snap = await db.collection('asset_categories').doc(a.category_id.toString()).get();
        if (snap.exists) a.category_name = snap.data().name;
      }
      if (a.subcategory_id) {
        const snap = await db.collection('asset_subcategories').doc(a.subcategory_id.toString()).get();
        if (snap.exists) a.subcategory_name = snap.data().name;
      }
      if (a.vendor_id) {
        const snap = await db.collection('vendors').doc(a.vendor_id.toString()).get();
        if (snap.exists) a.vendor_name = snap.data().name;
      }
      if (a.location_id) {
        const snap = await db.collection('locations').doc(a.location_id.toString()).get();
        if (snap.exists) a.location_name = snap.data().name;
      }
      if (a.assigned_to) {
        const snap = await db.collection('users').doc(a.assigned_to.toString()).get();
        if (snap.exists) a.assigned_user_name = snap.data().full_name;
      }
      return a;
    }));
  },

  async count({ status, category_id, location_id, search }) {
    // In real app, we might use a counter or metadata doc
    const assets = await this.findAll({ status, category_id, location_id, search, limit: 10000 });
    return assets.length;
  },

  async findById(id) {
    const snap = await db.collection('assets').doc(id.toString()).get();
    if (!snap.exists) return null;
    const a = toObj(snap);

    // Resolve details
    if (a.category_id) {
      const doc = await db.collection('asset_categories').doc(a.category_id.toString()).get();
      if (doc.exists) a.category_name = doc.data().name;
    }
    if (a.subcategory_id) {
      const doc = await db.collection('asset_subcategories').doc(a.subcategory_id.toString()).get();
      if (doc.exists) a.subcategory_name = doc.data().name;
    }
    if (a.vendor_id) {
      const doc = await db.collection('vendors').doc(a.vendor_id.toString()).get();
      if (doc.exists) a.vendor_name = doc.data().name;
    }
    if (a.location_id) {
      const doc = await db.collection('locations').doc(a.location_id.toString()).get();
      if (doc.exists) a.location_name = doc.data().name;
    }
    if (a.assigned_to) {
      const doc = await db.collection('users').doc(a.assigned_to.toString()).get();
      if (doc.exists) a.assigned_user_name = doc.data().full_name;
    }
    return a;
  },

  async findByCode(code) {
    const snap = await db.collection('assets').where('asset_code', '==', code).get();
    if (snap.empty) return null;
    return toObj(snap.docs[0]);
  },

  async update(id, updates) {
    const docRef = db.collection('assets').doc(id.toString());
    const cleanUpdates = { ...updates };
    
    // Convert date strings
    if (typeof cleanUpdates.purchase_date === 'string') cleanUpdates.purchase_date = new Date(cleanUpdates.purchase_date);
    if (typeof cleanUpdates.warranty_expiry === 'string') cleanUpdates.warranty_expiry = new Date(cleanUpdates.warranty_expiry);

    await docRef.update({
      ...cleanUpdates,
      updated_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async delete(id) {
    await db.collection('assets').doc(id.toString()).delete();
  },

  async getNextCode() {
    const snap = await db.collection('assets').orderBy('created_at', 'desc').limit(1).get();
    let nextId = 1;
    if (!snap.empty) {
      // Very crude way to simulate auto-increment, in production use a counter
      const totalDocs = (await db.collection('assets').count().get()).data().count;
      nextId = totalDocs + 1;
    }
    return `AST-${String(nextId).padStart(4, '0')}`;
  },

  async getStats() {
    const allAssetsSnap = await db.collection('assets').get();
    const assets = allAssetsSnap.docs.map(d => d.data());

    const total = allAssetsSnap.size;

    const byStatusMap = {};
    assets.forEach(a => {
      byStatusMap[a.status] = (byStatusMap[a.status] || 0) + 1;
    });
    const byStatus = Object.keys(byStatusMap).map(s => ({ status: s, count: byStatusMap[s] }));

    // By Category
    const catSnap = await db.collection('asset_categories').get();
    const byCategory = await Promise.all(catSnap.docs.map(async (doc) => {
      const count = assets.filter(a => a.category_id == doc.id).length;
      return { name: doc.data().name, count };
    }));

    // By Location
    const locSnap = await db.collection('locations').get();
    const byLocation = await Promise.all(locSnap.docs.map(async (doc) => {
      const count = assets.filter(a => a.location_id == doc.id).length;
      return { name: doc.data().name, count };
    }));

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const now = new Date();

    const formatDate = (val) => {
      if (!val) return null;
      return val.toDate ? val.toDate() : new Date(val);
    };

    const warrantyExpiring = assets
      .filter(a => {
        const d = formatDate(a.warranty_expiry);
        return d && d <= thirtyDaysFromNow && d >= now;
      })
      .map(a => ({ ...a, warranty_expiry: formatDate(a.warranty_expiry) }));

    const maintSnap = await db.collection('asset_maintenance').get();
    const maintenance = maintSnap.docs.map(d => d.data());
    const totalMaintCost = maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

    return {
      total,
      byStatus,
      byCategory,
      byLocation,
      warrantyExpiring,
      maintenanceCost: { total_cost: totalMaintCost, total_records: maintenance.length },
      topProblematic: [] // Complex aggregation omitted for brevity
    };
  }
};

// ===========================================================================
// ASSET ASSIGNMENT MODEL
// ===========================================================================
export const AssetAssignment = {
  async assign(data) {
    const docRef = await db.collection('asset_assignments').add({
      ...data,
      assigned_at: timestamp(),
      returned_at: null
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async returnAsset(assignmentId) {
    const docRef = db.collection('asset_assignments').doc(assignmentId);
    await docRef.update({ returned_at: timestamp() });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findActiveByAsset(assetId) {
    const snap = await db.collection('asset_assignments')
      .where('asset_id', '==', assetId.toString())
      .where('returned_at', '==', null)
      .get();
    if (snap.empty) return null;
    const a = toObj(snap.docs[0]);
    if (a.assigned_by) {
      const userDoc = await db.collection('users').doc(a.assigned_by.toString()).get();
      if (userDoc.exists) a.assigned_by_name = userDoc.data().full_name;
    }
    return a;
  },

  async findHistoryByAsset(assetId) {
    const snap = await db.collection('asset_assignments')
      .where('asset_id', '==', assetId.toString())
      .get();
    
    const results = await Promise.all(snap.docs.map(async (doc) => {
      const a = toObj(doc);
      if (a.assigned_by) {
        const userDoc = await db.collection('users').doc(a.assigned_by.toString()).get();
        if (userDoc.exists) a.assigned_by_name = userDoc.data().full_name;
      }
      return a;
    }));

    return results.sort((a, b) => (b.assigned_at?.toDate?.() || 0) - (a.assigned_at?.toDate?.() || 0));
  }
};

// ===========================================================================
// ASSET LOG MODEL
// ===========================================================================
export const AssetLog = {
  async create(data) {
    const docRef = await db.collection('asset_logs').add({
      ...data,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findByAsset(assetId, limit = 50) {
    const snap = await db.collection('asset_logs')
      .where('asset_id', '==', assetId.toString())
      .get();
    
    const logs = snap.docs.map(doc => toObj(doc));
    return logs.sort((a,b) => (b.created_at?.toDate?.() || 0) - (a.created_at?.toDate?.() || 0)).slice(0, limit);
  }
};

// ===========================================================================
// ASSET MAINTENANCE MODEL
// ===========================================================================
export const AssetMaintenance = {
  async create(data) {
    const docRef = await db.collection('asset_maintenance').add({
      ...data,
      created_at: timestamp(),
      status: data.status || 'pending'
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findByAsset(assetId) {
    const snap = await db.collection('asset_maintenance')
      .where('asset_id', '==', assetId.toString())
      .get();

    const results = await Promise.all(snap.docs.map(async (doc) => {
      const m = toObj(doc);
      if (m.vendor_id) {
        const vDoc = await db.collection('vendors').doc(m.vendor_id.toString()).get();
        if (vDoc.exists) m.vendor_name = vDoc.data().name;
      }
      if (m.created_by) {
        const uDoc = await db.collection('users').doc(m.created_by.toString()).get();
        if (uDoc.exists) m.created_by_name = uDoc.data().full_name;
      }
      return m;
    }));

    return results.sort((a, b) => (b.created_at?.toDate?.() || 0) - (a.created_at?.toDate?.() || 0));
  },

  async update(id, updates) {
    const docRef = db.collection('asset_maintenance').doc(id.toString());
    await docRef.update({ ...updates, updated_at: timestamp() });
    const snap = await docRef.get();
    return toObj(snap);
  }
};

// ===========================================================================
// ASSET CATEGORY MODEL
// ===========================================================================
export const AssetCategory = {
  async findAll() {
    const snap = await db.collection('asset_categories').where('is_active', '==', true).get();
    return snap.docs
      .map(doc => toObj(doc))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
  },
  async findOrCreateByName(name) {
    const snap = await db.collection('asset_categories').where('name', '==', name.trim()).get();
    if (!snap.empty) return toObj(snap.docs[0]);
    return await this.create({ name: name.trim() });
  },
  async create(data) {
    const docRef = await db.collection('asset_categories').add({
      ...data,
      is_active: true,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },
  async findSubcategories(categoryId) {
    const snap = await db.collection('asset_subcategories')
      .where('category_id', '==', categoryId.toString())
      .where('is_active', '==', true)
      .get();
    return snap.docs
      .map(doc => toObj(doc))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
  },
  async findOrCreateSubcategoryByName(categoryId, name) {
    const snap = await db.collection('asset_subcategories')
      .where('category_id', '==', categoryId.toString())
      .where('name', '==', name.trim())
      .get();
    if (!snap.empty) return toObj(snap.docs[0]);
    
    const docRef = await db.collection('asset_subcategories').add({
      category_id: categoryId.toString(),
      name: name.trim(),
      is_active: true,
      created_at: timestamp()
    });
    const result = await docRef.get();
    return toObj(result);
  }
};

// ===========================================================================
// VENDOR MODEL
// ===========================================================================
export const Vendor = {
  async findAll() {
    const snap = await db.collection('vendors').where('is_active', '==', true).get();
    return snap.docs
      .map(doc => toObj(doc))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
  },
  async findByName(name) {
    const snap = await db.collection('vendors').where('name', '==', name.trim()).get();
    if (snap.empty) return null;
    return toObj(snap.docs[0]);
  },
  async findOrCreateByName(name) {
    const existing = await this.findByName(name);
    if (existing) return existing;
    return await this.create({ name });
  },
  async create(data) {
    const docRef = await db.collection('vendors').add({
      ...data,
      name: data.name.trim(),
      is_active: true,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  }
};

// ===========================================================================
// LOCATION MODEL
// ===========================================================================
export const Location = {
  async findAll() {
    const snap = await db.collection('locations').where('is_active', '==', true).orderBy('name').get();
    return snap.docs.map(doc => toObj(doc));
  },
  async findByName(name) {
    const snap = await db.collection('locations').where('name', '==', name.trim()).get();
    if (snap.empty) return null;
    return toObj(snap.docs[0]);
  },
  async findOrCreateByName(name) {
    const existing = await this.findByName(name);
    if (existing) return existing;
    return await this.create({ name });
  },
  async create(data) {
    const docRef = await db.collection('locations').add({
      ...data,
      name: data.name.trim(),
      is_active: true,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  }
};

// ===========================================================================
// SOFTWARE LICENSE MODEL
// ===========================================================================
export const SoftwareLicense = {
  async create(data) {
    const docRef = await db.collection('software_licenses').add({
      ...data,
      used_seats: 0,
      created_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll() {
    const snap = await db.collection('software_licenses').orderBy('name').get();
    return await Promise.all(snap.docs.map(async (doc) => {
      const sl = toObj(doc);
      if (sl.vendor_id) {
        const vSnap = await db.collection('vendors').doc(sl.vendor_id.toString()).get();
        if (vSnap.exists) sl.vendor_name = vSnap.data().name;
      }
      return sl;
    }));
  },

  async findById(id) {
    const snap = await db.collection('software_licenses').doc(id.toString()).get();
    if (!snap.exists) return null;
    const sl = toObj(snap);
    if (sl.vendor_id) {
      const vSnap = await db.collection('vendors').doc(sl.vendor_id.toString()).get();
      if (vSnap.exists) sl.vendor_name = vSnap.data().name;
    }
    return sl;
  },

  async update(id, updates) {
    const docRef = db.collection('software_licenses').doc(id.toString());
    await docRef.update({ ...updates, updated_at: timestamp() });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async delete(id) {
    await db.collection('software_licenses').doc(id.toString()).delete();
  },

  async assign(data) {
    const licenseRef = db.collection('software_licenses').doc(data.license_id.toString());
    const licSnap = await licenseRef.get();
    if (!licSnap.exists) throw new Error('License not found');
    const lic = licSnap.data();
    if (lic.used_seats >= lic.total_seats) throw new Error('No available seats');

    const docRef = await db.collection('license_assignments').add({
      ...data,
      assigned_at: timestamp()
    });
    await licenseRef.update({ used_seats: FieldValue.increment(1) });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async revoke(assignmentId) {
    const docRef = db.collection('license_assignments').doc(assignmentId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data().revoked_at) throw new Error('Assignment not found or revoked');
    
    await docRef.update({ revoked_at: timestamp() });
    const licenseId = snap.data().license_id;
    await db.collection('software_licenses').doc(licenseId.toString()).update({
      used_seats: FieldValue.increment(-1)
    });
  },

  async findAssignments(licenseId) {
    const snap = await db.collection('license_assignments')
      .where('license_id', '==', licenseId.toString())
      .orderBy('assigned_at', 'desc')
      .get();
    return snap.docs.map(doc => toObj(doc));
  },

  async getExpiringLicenses() {
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const snap = await db.collection('software_licenses').get();
    
    const formatDate = (val) => {
      if (!val) return null;
      return val.toDate ? val.toDate() : new Date(val);
    };

    return snap.docs
      .map(d => toObj(d))
      .filter(l => {
        const d = formatDate(l.expiry_date);
        return d && d <= thirtyDays;
      });
  }
};

// ===========================================================================
// INVENTORY MODEL
// ===========================================================================
export const InventoryItem = {
  async create(data) {
    const docRef = await db.collection('inventory_items').add({
      ...data,
      created_at: timestamp(),
      updated_at: timestamp()
    });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async findAll() {
    const snap = await db.collection('inventory_items').orderBy('name').get();
    return await Promise.all(snap.docs.map(async (doc) => {
      const i = toObj(doc);
      if (i.location_id) {
        const lSnap = await db.collection('locations').doc(i.location_id.toString()).get();
        if (lSnap.exists) i.location_name = lSnap.data().name;
      }
      return i;
    }));
  },

  async update(id, updates) {
    const docRef = db.collection('inventory_items').doc(id.toString());
    await docRef.update({ ...updates, updated_at: timestamp() });
    const snap = await docRef.get();
    return toObj(snap);
  },

  async delete(id) {
    await db.collection('inventory_items').doc(id.toString()).delete();
  },

  async getLowStock() {
    const snap = await db.collection('inventory_items').get();
    const items = snap.docs.map(d => toObj(d));
    return items.filter(i => i.quantity <= i.reorder_level);
  }
};

// ===========================================================================
// TICKET-ASSET LINK
// ===========================================================================
export const TicketAsset = {
  async findTicketsByAsset(assetId) {
    const snap = await db.collection('tickets')
      .where('asset_id', '==', assetId.toString())
      .get();
      
    const tickets = snap.docs.map(doc => {
      const t = doc.data();
      return { id: doc.id, ticket_id: t.ticket_id, issue_title: t.issue_title, status: t.status, priority: t.priority, created_at: t.created_at };
    });

    return tickets.sort((a,b) => (b.created_at?.toDate?.() || 0) - (a.created_at?.toDate?.() || 0));
  },

  async linkAssetToTicket(ticketId, assetId) {
    await db.collection('tickets').doc(ticketId.toString()).update({ asset_id: assetId });
  }
};
