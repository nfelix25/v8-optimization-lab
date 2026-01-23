import express from 'express';
import { DocsService } from '../services/DocsService.js';

const router = express.Router();
const docsService = new DocsService();

// GET /api/docs - List all docs
router.get('/', async (req, res, next) => {
  try {
    const docs = await docsService.listDocs();
    res.json(docs);
  } catch (error) {
    next(error);
  }
});

// GET /api/docs/:slug - Get single doc
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const doc = await docsService.getDoc(slug);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(doc);
  } catch (error) {
    next(error);
  }
});

export default router;
