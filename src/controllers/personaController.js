/**
 * personaController.js
 * Handles: list personas, get persona profile, follow/unfollow.
 */
import Persona from '../models/personaModel.js';
import userModel from '../models/userModel.js';
import { getPersonaWithPosts } from '../services/personaService.js';

/** GET /api/persona — list all active personas */
export const listPersonas = async (req, res) => {
  try {
    const personas = await Persona.find({ isActive: true }).sort({ credibilityScore: -1 }).lean();
    res.json({ success: true, data: personas });
  } catch (err) {
    console.error('listPersonas error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** GET /api/persona/:id — single persona with recent posts */
export const getPersona = async (req, res) => {
  try {
    const result = await getPersonaWithPosts(req.params.id);
    if (!result.persona) return res.status(404).json({ success: false, message: 'Persona not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('getPersona error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** POST /api/persona/:id/follow — follow a persona (auth required) */
export const followPersona = async (req, res) => {
  try {
    const personaId = req.params.id;
    const userId = req.dbUser._id;

    const persona = await Persona.findById(personaId);
    if (!persona) return res.status(404).json({ success: false, message: 'Persona not found' });

    const user = await userModel.findById(userId);
    const alreadyFollowing = user.followedPersonas?.some((id) => id.toString() === personaId);

    if (alreadyFollowing) {
      // Unfollow
      await userModel.findByIdAndUpdate(userId, { $pull: { followedPersonas: personaId } });
      await Persona.findByIdAndUpdate(personaId, { $inc: { followerCount: -1 } });
      return res.json({ success: true, message: 'Unfollowed persona', following: false });
    }

    // Follow
    await userModel.findByIdAndUpdate(userId, { $addToSet: { followedPersonas: personaId } });
    await Persona.findByIdAndUpdate(personaId, { $inc: { followerCount: 1 } });
    res.json({ success: true, message: 'Following persona', following: true });
  } catch (err) {
    console.error('followPersona error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Admin controllers ───────────────────────────────────────────────── */

/** POST /api/admin/feed/persona — create persona */
export const createPersona = async (req, res) => {
  try {
    const persona = await Persona.create(req.body);
    res.status(201).json({ success: true, data: persona });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Username already exists' });
    console.error('createPersona error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** PUT /api/admin/feed/persona/:id — update persona */
export const updatePersona = async (req, res) => {
  try {
    const persona = await Persona.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!persona) return res.status(404).json({ success: false, message: 'Persona not found' });
    res.json({ success: true, data: persona });
  } catch (err) {
    console.error('updatePersona error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** DELETE /api/admin/feed/persona/:id — delete persona */
export const deletePersona = async (req, res) => {
  try {
    await Persona.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Persona deleted' });
  } catch (err) {
    console.error('deletePersona error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
