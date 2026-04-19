import { Router } from 'express';
import { getHistory, deleteTranscript, clearHistory } from '../services/dbService.js';

const router = Router();

router.get('/', (req, res) => {
  const items = getHistory();
  res.json(items);
});

router.delete('/all', (req, res) => {
  clearHistory();
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const deleted = deleteTranscript(id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;
