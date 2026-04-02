import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ManageArticles = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    category_id: '',
    is_published: true
  });

  useEffect(() => {
    fetchArticles();
    fetchCategories();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data } = await axios.get('/api/kb?isAdmin=true');
      setArticles(data);
    } catch (error) {
      console.error('Fetch articles error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/categories');
      setCategories(data);
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Auto generate slug from title if title is changed and we are creating new
    if (name === 'title' && !editingArticle) {
       // Support Thai and English characters, replace spaces with dashes
       const autoSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9ก-๙\-]+/g, '').replace(/(^-|-$)+/g, '');
       setFormData(prev => ({ ...prev, title: value, slug: autoSlug }));
    } else {
       setFormData(prev => ({ 
         ...prev, 
         [name]: type === 'checkbox' ? checked : value 
       }));
    }
  };

  const openNewModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '', slug: '', content: '', category_id: '', is_published: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      content: article.content,
      category_id: article.category_id || '',
      is_published: article.is_published
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await axios.put(`/api/kb/${editingArticle.id}`, formData);
      } else {
        await axios.post('/api/kb', formData);
      }
      setIsModalOpen(false);
      fetchArticles();
    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await axios.delete(`/api/kb/${id}`);
      fetchArticles();
    } catch (error) {
      alert('Failed to delete article');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading articles...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Knowledge Base</h1>
        <button onClick={openNewModal} className="btn-primary">
          + Create Article
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">Author</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles.map(article => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{article.title}</div>
                  <div className="text-xs text-gray-500">/{article.slug}</div>
                </td>
                <td className="px-4 py-3 text-sm">{article.category_name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${article.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {article.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{article.author_name}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEditModal(article)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No articles created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingArticle ? 'Edit Article' : 'New Article'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input" placeholder="Article title" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                  <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="input" placeholder="url-slug-format" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select name="category_id" value={formData.category_id} onChange={handleChange} className="input">
                    <option value="">-- No Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content / Body *</label>
                <div className="bg-white rounded border border-gray-300">
                  <ReactQuill 
                    theme="snow"
                    value={formData.content}
                    onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                    className="h-64 mb-12"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image'],
                        ['clean']
                      ]
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_published" 
                  name="is_published" 
                  checked={formData.is_published} 
                  onChange={handleChange} 
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900">
                  Publish (Visible to public)
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={!formData.title || !formData.slug || !formData.content}>
                  {editingArticle ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageArticles;
