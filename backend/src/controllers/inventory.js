import { InventoryItem, Location } from '../models/assetModels.js';

export const createInventoryItem = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name) return res.status(400).json({ message: 'Item name is required' });

    if (data.location_name) {
      const l = await Location.findOrCreateByName(data.location_name);
      data.location_id = l.id;
      delete data.location_name;
    }

    const item = await InventoryItem.create(data);
    res.status(201).json({ message: 'Inventory item created', item });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.findAll();
    res.json(items);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.location_name) {
      const l = await Location.findOrCreateByName(data.location_name);
      data.location_id = l.id;
      delete data.location_name;
    }

    const updated = await InventoryItem.update(req.params.id, data);
    if (!updated) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item updated', item: updated });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteInventoryItem = async (req, res) => {
  try {
    await InventoryItem.delete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLowStock = async (req, res) => {
  try {
    const items = await InventoryItem.getLowStock();
    res.json(items);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
