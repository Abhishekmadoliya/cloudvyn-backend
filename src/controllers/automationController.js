import automationModel from "../models/automationModel.js";

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

/**
 * GET /api/automations/all
 * Returns published automations with optional category/useCase filters.
 */
export const getAutomations = async (req, res) => {
    try {
        const { category, useCase } = req.query;
        let query = { status: 'published' };

        if (category) query.category = { $regex: new RegExp(category, 'i') };
        if (useCase)  query.useCase  = { $regex: new RegExp(useCase,  'i') };

        const automations = await automationModel.find(query).sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: automations.length, data: automations });
    } catch (error) {
        console.error("Error fetching automations:", error);
        res.status(500).json({ success: false, message: "Server error while fetching automations" });
    }
};

/**
 * GET /api/automations/get/:slug
 * Returns a single published automation by slug.
 */
export const getAutomationBySlug = async (req, res) => {
    try {
        const automation = await automationModel.findOne({ slug: req.params.slug, status: 'published' });

        if (!automation) {
            return res.status(404).json({ success: false, message: "Automation not found" });
        }

        res.status(200).json({ success: true, data: automation });
    } catch (error) {
        console.error("Error fetching automation by slug:", error);
        res.status(500).json({ success: false, message: "Server error while fetching automation" });
    }
};


// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/automations/all
 * Returns ALL automations (any status) with pagination.
 */
export const getAllAutomationsAdmin = async (req, res) => {
    try {
        const { category, useCase, status, page = 1, limit = 20 } = req.query;
        let query = {};

        if (category) query.category = { $regex: new RegExp(category, 'i') };
        if (useCase)  query.useCase  = { $regex: new RegExp(useCase,  'i') };
        if (status)   query.status   = status;

        const skip  = (parseInt(page) - 1) * parseInt(limit);
        const total = await automationModel.countDocuments(query);
        const automations = await automationModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: automations.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            data: automations
        });
    } catch (error) {
        console.error("Error fetching all automations (admin):", error);
        res.status(500).json({ success: false, message: "Server error while fetching automations" });
    }
};

/**
 * POST /api/admin/automations/create
 * Creates a new automation.
 */
export const createAutomation = async (req, res) => {
    try {
        const { title, description, slug, category, useCase, tags, image, content, status } = req.body;

        if (!title || !description || !slug || !category || !useCase) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing: title, description, slug, category, useCase"
            });
        }

        const existingAutomation = await automationModel.findOne({ slug });
        if (existingAutomation) {
            return res.status(400).json({ success: false, message: "Slug already exists" });
        }

        const newAutomation = await automationModel.create({
            title, description, slug, category, useCase,
            tags: tags || [],
            image: image || null,
            content: content || null,
            status: status || 'published'
        });

        res.status(201).json({ success: true, data: newAutomation });
    } catch (error) {
        console.error("Error creating automation:", error);
        res.status(500).json({ success: false, message: "Server error while creating automation" });
    }
};

/**
 * PUT /api/admin/automations/update/:id
 * Updates an existing automation by MongoDB _id.
 */
export const updateAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, slug, category, useCase, tags, image, content, status } = req.body;

        const automation = await automationModel.findById(id);
        if (!automation) {
            return res.status(404).json({ success: false, message: "Automation not found" });
        }

        // If slug is being changed, ensure it is still unique
        if (slug && slug !== automation.slug) {
            const slugExists = await automationModel.findOne({ slug });
            if (slugExists) {
                return res.status(400).json({ success: false, message: "Slug already in use by another automation" });
            }
        }

        const updated = await automationModel.findByIdAndUpdate(
            id,
            { title, description, slug, category, useCase, tags, image, content, status },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error("Error updating automation:", error);
        res.status(500).json({ success: false, message: "Server error while updating automation" });
    }
};

/**
 * DELETE /api/admin/automations/delete/:id
 * Hard-deletes an automation by MongoDB _id.
 */
export const deleteAutomation = async (req, res) => {
    try {
        const { id } = req.params;
        const automation = await automationModel.findByIdAndDelete(id);

        if (!automation) {
            return res.status(404).json({ success: false, message: "Automation not found" });
        }

        res.status(200).json({ success: true, message: "Automation deleted successfully" });
    } catch (error) {
        console.error("Error deleting automation:", error);
        res.status(500).json({ success: false, message: "Server error while deleting automation" });
    }
};

/**
 * PATCH /api/admin/automations/status/:id
 * Toggles the status of an automation between 'published' and 'draft'.
 */
export const toggleAutomationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const automation = await automationModel.findById(id);

        if (!automation) {
            return res.status(404).json({ success: false, message: "Automation not found" });
        }

        automation.status = automation.status === 'published' ? 'draft' : 'published';
        await automation.save();

        res.status(200).json({ success: true, data: automation, message: `Status changed to '${automation.status}'` });
    } catch (error) {
        console.error("Error toggling automation status:", error);
        res.status(500).json({ success: false, message: "Server error while toggling status" });
    }
};


// get all slugs for sitemap
export const getAllSlugs = async (req, res) => {
    try {
        const slugs = await automationModel.find({ status: 'published' }).select('slug updatedAt');
        res.status(200).json({ success: true, data: slugs });
    } catch (error) {
        console.error("Error fetching slugs:", error);
        res.status(500).json({ success: false, message: "Server error while fetching slugs" });
    }
};