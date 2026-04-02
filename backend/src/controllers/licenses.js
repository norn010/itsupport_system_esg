import { SoftwareLicense, Vendor } from '../models/assetModels.js';

export const createLicense = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name) return res.status(400).json({ message: 'License name is required' });

    if (data.vendor_name) {
      const v = await Vendor.findOrCreateByName(data.vendor_name);
      data.vendor_id = v.id;
      delete data.vendor_name;
    }

    const license = await SoftwareLicense.create(data);
    res.status(201).json({ message: 'License created', license });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLicenses = async (req, res) => {
  try {
    const licenses = await SoftwareLicense.findAll();
    res.json(licenses);
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLicenseById = async (req, res) => {
  try {
    const license = await SoftwareLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ message: 'License not found' });
    const assignments = await SoftwareLicense.findAssignments(req.params.id);
    res.json({ ...license, assignments });
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLicense = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.vendor_name) {
      const v = await Vendor.findOrCreateByName(data.vendor_name);
      data.vendor_id = v.id;
      delete data.vendor_name;
    }

    const updated = await SoftwareLicense.update(req.params.id, data);
    if (!updated) return res.status(404).json({ message: 'License not found' });
    res.json({ message: 'License updated', license: updated });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteLicense = async (req, res) => {
  try {
    await SoftwareLicense.delete(req.params.id);
    res.json({ message: 'License deleted' });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const assignLicense = async (req, res) => {
  try {
    const { license_id, user_name, asset_id } = req.body;
    if (!license_id) return res.status(400).json({ message: 'License ID is required' });

    const assignment = await SoftwareLicense.assign({ license_id, user_name, asset_id });
    res.json({ message: 'License assigned', assignment });
  } catch (error) {
    console.error('Assign license error:', error);
    if (error.message === 'No available seats') {
      return res.status(400).json({ message: 'No available seats for this license' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const revokeLicense = async (req, res) => {
  try {
    await SoftwareLicense.revoke(req.params.assignmentId);
    res.json({ message: 'License assignment revoked' });
  } catch (error) {
    console.error('Revoke license error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getExpiringLicenses = async (req, res) => {
  try {
    const licenses = await SoftwareLicense.getExpiringLicenses();
    res.json(licenses);
  } catch (error) {
    console.error('Get expiring licenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
