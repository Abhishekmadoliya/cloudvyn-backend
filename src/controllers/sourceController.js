/**
 * sourceController.js
 * Handles: source management (fact-checking references).
 */
import Source from '../models/sourceModel.js';

/** GET /api/source — list sources */
export const listSources = async (req, res) => {
  try {
    const { limit = 20, publisher } = req.query;
    const query = publisher ? { publisher } : {};
    const sources = await Source.find(query).sort({ reliabilityScore: -1 }).limit(Number(limit)).lean();
    res.json({ success: true, data: sources });
  } catch (err) {
    console.error('listSources error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /api/admin/feed/source — create source */
export const createSource = async (req, res) => {
  try {
    const source = await Source.create(req.body);
    res.status(201).json({ success: true, data: source });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Source URL already exists' });
    console.error('createSource error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** PUT /api/admin/feed/source/:id — update source */
export const updateSource = async (req, res) => {
  try {
    const source = await Source.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!source) return res.status(404).json({ success: false, message: 'Source not found' });
    res.json({ success: true, data: source });
  } catch (err) {
    console.error('updateSource error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** DELETE /api/admin/feed/source/:id */
export const deleteSource = async (req, res) => {
  try {
    await Source.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Source deleted' });
  } catch (err) {
    console.error('deleteSource error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
