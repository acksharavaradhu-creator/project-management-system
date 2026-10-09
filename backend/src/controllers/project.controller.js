const prisma = require('../config/db');
const { projectStatus } = require('../validators/project.validators');

// Turns "12" into 12. Returns null if it is not a positive whole number
// that fits in the database ID column (the biggest allowed value is 2147483647).
const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
};

// Turns "2026-10-08" into a Date. Empty or missing becomes null.
const toDate = (value) => (value ? new Date(value) : null);

// GET /api/projects?search=abc&status=IN_PROGRESS
const getProjects = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    // Only this user's projects
    const where = { userId: req.user.id };

    if (typeof search === 'string' && search.trim() !== '') {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    if (status !== undefined) {
      const parsed = projectStatus.safeParse(status);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid status filter',
          errors: [
            {
              path: 'status',
              message: 'Status must be NOT_STARTED, IN_PROGRESS or COMPLETED',
            },
          ],
        });
      }
      where.status = parsed.data;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true } } },
    });

    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id
const getProject = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid project id' });

    const project = await prisma.project.findFirst({
      where: { id, userId: req.user.id },
      include: { _count: { select: { tasks: true } } },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.json({ project });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const { name, description, status, startDate, endDate } = req.body;

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        name,
        description: description ?? null,
        status, // if missing, the database default (NOT_STARTED) is used
        startDate: toDate(startDate),
        endDate: toDate(endDate),
      },
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid project id' });

    // Must exist AND belong to this user, otherwise 404
    const existing = await prisma.project.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    const body = req.body;
    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.startDate !== undefined) data.startDate = toDate(body.startDate);
    if (body.endDate !== undefined) data.endDate = toDate(body.endDate);

    // If only one date was sent, compare it with the saved one
    const finalStart = 'startDate' in data ? data.startDate : existing.startDate;
    const finalEnd = 'endDate' in data ? data.endDate : existing.endDate;
    if (finalStart && finalEnd && finalEnd < finalStart) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [
          { path: 'endDate', message: 'End date cannot be before start date' },
        ],
      });
    }

    const project = await prisma.project.update({ where: { id }, data });

    res.json({ project });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid project id' });

    const existing = await prisma.project.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: 'Project not found' });

    // Its tasks are deleted automatically (onDelete Cascade)
    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};