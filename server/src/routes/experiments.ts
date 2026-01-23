import express from 'express';
import { ExperimentsService } from '../services/ExperimentsService.js';

const router = express.Router();
const experimentsService = new ExperimentsService();

// GET /api/experiments - List all experiments
router.get('/', async (req, res, next) => {
  try {
    const experiments = await experimentsService.listExperiments();
    res.json(experiments);
  } catch (error) {
    next(error);
  }
});

// GET /api/experiments/:slug - Get single experiment
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const experiment = await experimentsService.getExperiment(slug);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json(experiment);
  } catch (error) {
    next(error);
  }
});

export default router;
