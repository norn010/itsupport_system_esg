import db from '../config/firebase.js';

const toObj = (doc) => {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

export const getArticles = async (req, res) => {
  try {
    const { categoryId, search, isAdmin } = req.query;
    
    const snap = await db.collection('knowledge_base_articles').get();
    let articles = snap.docs.map(doc => toObj(doc));

    // In-memory filter and sort
    if (isAdmin !== 'true') {
      articles = articles.filter(a => a.is_published === true);
    }

    if (categoryId) {
      articles = articles.filter(a => a.category_id === categoryId);
    }

    // Sort by created_at descending
    articles.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dateB - dateA;
    });

    if (search) {
      const ls = search.toLowerCase();
      articles = articles.filter(a => 
        (a.title && a.title.toLowerCase().includes(ls)) ||
        (a.content && a.content.toLowerCase().includes(ls))
      );
    }

    const enriched = await Promise.all(articles.map(async (a) => {
      if (a.category_id) {
        const catSnap = await db.collection('categories').doc(a.category_id.toString()).get();
        if (catSnap.exists) a.category_name = catSnap.data().name;
      }
      if (a.created_by) {
        const userSnap = await db.collection('users').doc(a.created_by.toString()).get();
        if (userSnap.exists) a.author_name = userSnap.data().full_name;
      }
      return a;
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const snap = await db.collection('knowledge_base_articles').where('slug', '==', slug).get();
    
    if (snap.empty) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const a = toObj(snap.docs[0]);
    if (a.category_id) {
      const catSnap = await db.collection('categories').doc(a.category_id.toString()).get();
      if (catSnap.exists) a.category_name = catSnap.data().name;
    }
    if (a.created_by) {
      const userSnap = await db.collection('users').doc(a.created_by.toString()).get();
      if (userSnap.exists) a.author_name = userSnap.data().full_name;
    }

    res.json(a);
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createArticle = async (req, res) => {
  try {
    const { title, slug, content, category_id, is_published } = req.body;
    
    if (!title || !slug || !content) {
      return res.status(400).json({ message: 'Title, slug, and content are required' });
    }

    // Uniqueness check for slug
    const checkSnap = await db.collection('knowledge_base_articles').where('slug', '==', slug).get();
    if (!checkSnap.empty) {
      return res.status(400).json({ message: 'Slug must be unique' });
    }

    const docData = {
      title,
      slug,
      content,
      category_id: category_id || null,
      is_published: is_published ? true : false,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await db.collection('knowledge_base_articles').add(docData);
    const snap = await docRef.get();

    res.status(201).json({
      message: 'Article created successfully',
      article: toObj(snap)
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, category_id, is_published } = req.body;

    const docRef = db.collection('knowledge_base_articles').doc(id);
    const checkSnap = await docRef.get();
    
    if (!checkSnap.exists) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Slug unique check (if slug changed)
    if (slug !== checkSnap.data().slug) {
      const slugSnap = await db.collection('knowledge_base_articles').where('slug', '==', slug).get();
      if (!slugSnap.empty) return res.status(400).json({ message: 'Slug must be unique' });
    }

    const updateData = {
      title,
      slug,
      content,
      category_id: category_id || null,
      is_published: is_published ? true : false,
      updated_at: new Date()
    };
    
    await docRef.update(updateData);
    const snap = await docRef.get();

    res.json({
      message: 'Article updated successfully',
      article: toObj(snap)
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('knowledge_base_articles').doc(id);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return res.status(404).json({ message: 'Article not found' });
    }

    await docRef.delete();
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
