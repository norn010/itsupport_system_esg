import { Asset, AssetAssignment, AssetLog, AssetMaintenance, AssetCategory, Vendor, Location, TicketAsset } from '../models/assetModels.js';
import { createSystemNotification, notifyAllITStaff } from './notifications.js';
import fs from 'fs';

// Ensure asset uploads directory exists
const assetDir = 'uploads/assets';
if (!fs.existsSync(assetDir)) {
  fs.mkdirSync(assetDir, { recursive: true });
}

// Helper: log asset activity
const logAssetAction = async (assetId, actionType, description, actor) => {
  try {
    await AssetLog.create({
      asset_id: assetId,
      action_type: actionType,
      description,
      actor_id: actor?.id,
      actor_name: actor?.full_name || actor?.username || 'System',
      actor_role: actor?.role || null
    });
  } catch (err) { console.error('Log error:', err); }
};

const resolveIds = async (data) => {
  if (!data.vendor_id && data.vendor_name && data.vendor_name.trim()) {
    let v = await Vendor.findByName(data.vendor_name);
    if (!v) v = await Vendor.create({ name: data.vendor_name });
    data.vendor_id = v.id;
  }
  if (!data.location_id && data.location_name && data.location_name.trim()) {
    let l = await Location.findByName(data.location_name);
    if (!l) l = await Location.create({ name: data.location_name });
    data.location_id = l.id;
  }
};

// ==================== ASSET CRUD ====================

export const createAsset = async (req, res) => {
  try {
    await resolveIds(req.body);
    const data = req.body;
    if (!data.name) return res.status(400).json({ message: 'Asset name is required' });

    data.asset_code = await Asset.getNextCode();
    
    if (req.file) {
      data.image_url = `/uploads/assets/${req.file.filename}`;
    }

    const asset = await Asset.create(data);

    await logAssetAction(asset.id, 'created', `Asset ${asset.asset_code} created`, req.user);
    res.status(201).json({ message: 'Asset created', asset });
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAssets = async (req, res) => {
  try {
    const { status, category_id, location_id, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const assets = await Asset.findAll({ status, category_id, location_id, search, limit: parseInt(limit), offset: parseInt(offset) });
    const total = await Asset.count({ status, category_id, location_id, search });
    res.json({ assets, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const assignments = await AssetAssignment.findHistoryByAsset(asset.id);
    const maintenance = await AssetMaintenance.findByAsset(asset.id);
    const tickets = await TicketAsset.findTicketsByAsset(asset.id);
    const logs = await AssetLog.findByAsset(asset.id);

    res.json({ ...asset, assignments, maintenance, tickets, logs });
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    // IT staff can only update limited fields
    if (req.user.role === 'IT') {
      const allowed = ['status', 'location_id', 'description', 'assigned_to'];
      const keys = Object.keys(req.body);
      const invalid = keys.filter(k => !allowed.includes(k));
      if (invalid.length > 0) {
        return res.status(403).json({ message: `IT staff cannot update: ${invalid.join(', ')}` });
      }
    }

    await resolveIds(req.body);
    const updates = req.body;
    const changes = [];

    if (updates.status && updates.status !== asset.status) {
      changes.push(`Status: ${asset.status} → ${updates.status}`);
    }
    if (updates.location_id && updates.location_id !== asset.location_id) {
      changes.push(`Location changed`);
    }

    if (req.file) {
      updates.image_url = `/uploads/assets/${req.file.filename}`;
    }

    const updated = await Asset.update(req.params.id, updates);

    if (changes.length > 0) {
      await logAssetAction(asset.id, 'updated', changes.join('; '), req.user);
    }

    res.json({ message: 'Asset updated', asset: updated });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    await logAssetAction(asset.id, 'deleted', `Asset ${asset.asset_code} deleted`, req.user);
    await Asset.delete(req.params.id);

    res.json({ message: 'Asset deleted' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== ASSIGNMENT ====================

export const assignAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name, note } = req.body;

    if (!user_name) return res.status(400).json({ message: 'User name is required' });

    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    // Check if already assigned
    const active = await AssetAssignment.findActiveByAsset(id);
    if (active) return res.status(400).json({ message: 'Asset is already assigned. Return it first.' });

    const assignment = await AssetAssignment.assign({
      asset_id: parseInt(id),
      user_id: user_id || 0,
      user_name,
      assigned_by: req.user.id,
      note
    });

    await Asset.update(id, { status: 'In Use', assigned_to: user_id || null });
    await logAssetAction(parseInt(id), 'assigned', `Assigned to ${user_name}`, req.user);

    res.json({ message: 'Asset assigned', assignment });
  } catch (error) {
    console.error('Assign asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const returnAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const active = await AssetAssignment.findActiveByAsset(id);
    if (!active) return res.status(400).json({ message: 'Asset is not currently assigned' });

    await AssetAssignment.returnAsset(active.id);
    await Asset.update(id, { status: 'Available', assigned_to: null });
    await logAssetAction(parseInt(id), 'returned', `Returned by ${active.user_name}`, req.user);

    res.json({ message: 'Asset returned successfully' });
  } catch (error) {
    console.error('Return asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== MAINTENANCE ====================

export const createMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const data = { ...req.body, asset_id: parseInt(id), created_by: req.user.id };
    if (!data.issue_description) return res.status(400).json({ message: 'Issue description is required' });

    const record = await AssetMaintenance.create(data);
    await Asset.update(id, { status: 'Repair' });
    await logAssetAction(parseInt(id), 'maintenance', `Maintenance created: ${data.issue_description}`, req.user);

    res.status(201).json({ message: 'Maintenance record created', maintenance: record });
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMaintenance = async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const updated = await AssetMaintenance.update(maintenanceId, req.body);
    if (!updated) return res.status(404).json({ message: 'Maintenance record not found' });

    if (req.body.status === 'completed') {
      await Asset.update(updated.asset_id, { status: 'Available' });
      await logAssetAction(updated.asset_id, 'maintenance', 'Maintenance completed', req.user);
    }

    res.json({ message: 'Maintenance updated', maintenance: updated });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== HISTORY / LOGS ====================

export const getAssetHistory = async (req, res) => {
  try {
    const logs = await AssetLog.findByAsset(req.params.id);
    res.json(logs);
  } catch (error) {
    console.error('Get asset history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== LOOKUPS ====================

export const getAssetCategories = async (req, res) => {
  try {
    const categories = await AssetCategory.findAll();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAssetSubcategories = async (req, res) => {
  try {
    const subcategories = await AssetCategory.findSubcategories(req.params.categoryId);
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.findAll();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createVendor = async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ message: 'Vendor name is required' });
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ message: 'Vendor created', vendor });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLocations = async (req, res) => {
  try {
    const locations = await Location.findAll();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== DASHBOARD ====================

export const getAssetStats = async (req, res) => {
  try {
    const stats = await Asset.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get asset stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
