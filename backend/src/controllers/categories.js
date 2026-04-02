import { Category } from '../models/index.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const subcategories = await Category.findSubcategories(categoryId);
    res.json(subcategories);
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
