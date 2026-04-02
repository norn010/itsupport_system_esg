import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';

const KnowledgeBase = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [search, selectedCategory]);

  useEffect(() => {
    if (slug) {
      readArticle(slug);
    } else {
      setActiveArticle(null);
    }
  }, [slug]);

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/categories');
      setCategories(data);
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      
      const { data } = await axios.get(`/api/kb?${params}`);
      setArticles(data);
    } catch (error) {
      console.error('Fetch articles error:', error);
    } finally {
      setLoading(false);
    }
  };

  const readArticle = async (articleSlug) => {
    try {
      const { data } = await axios.get(`/api/kb/slug/${articleSlug}`);
      setActiveArticle(data);
      if (window.location.pathname !== `/knowledge-base/${articleSlug}`) {
        navigate(`/knowledge-base/${articleSlug}`);
      }
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Read article error:', error);
      navigate('/knowledge-base');
    }
  };

  if (activeArticle) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button 
          onClick={() => navigate('/knowledge-base')}
          className="mb-6 flex items-center text-primary-600 hover:text-primary-800 transition font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Knowledge Base
        </button>

        <div className="card">
          <div className="mb-6 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{activeArticle.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {activeArticle.category_name && (
                  <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-xs font-semibold">
                    {activeArticle.category_name}
                  </span>
                )}
                <span>By {activeArticle.author_name}</span>
                <span>•</span>
                <span>{new Date(activeArticle.updated_at || activeArticle.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <button 
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                copied 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-500 hover:text-primary-600 hover:shadow-lg'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  Copy Link
                </>
              )}
            </button>
          </div>
          <hr className="my-6 border-gray-100" />
          <div 
            className="prose max-w-none prose-indigo whitespace-pre-wrap break-words" 
            dangerouslySetInnerHTML={{ __html: activeArticle.content }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">How can we help you?</h1>
        <p className="text-lg text-gray-600 mb-8">Search our knowledge base for answers to common questions.</p>
        
        <div className="max-w-2xl mx-auto relative">
          <input
            type="text"
            placeholder="Search articles e.g. 'Reset Password'..."
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="md:col-span-1 border-r border-gray-100 pr-4">
          <h3 className="font-semibold text-gray-900 mb-4 uppercase tracking-wider text-sm">Categories</h3>
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${!selectedCategory ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                All Categories
              </button>
            </li>
            {categories.map(cat => (
              <li key={cat.id}>
                <button 
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedCategory === cat.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Article List */}
        <div className="md:col-span-3">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No articles found. Try another search term.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {articles.map(article => (
                <div 
                  key={article.id} 
                  onClick={() => readArticle(article.slug)}
                  className="card p-6 cursor-pointer hover:border-primary-300 hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 mb-2">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {article.content.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                      </p>
                      <div className="flex gap-3 text-xs text-gray-400">
                        {article.category_name && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {article.category_name}
                          </span>
                        )}
                        <span>{new Date(article.updated_at || article.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-primary-500 transform group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
