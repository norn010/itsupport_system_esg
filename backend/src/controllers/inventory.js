import { InventoryItem } from '../models/assetModels.js';

export const createInventoryItem = async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ message: 'Item name is required' });
    const item = await InventoryItem.create(req.body);
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
    const updated = await InventoryItem.update(req.params.id, req.body);
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
