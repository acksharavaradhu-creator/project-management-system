const prisma = require('../config/db');
const { taskStatus, priority: priorityEnum } = require('../validators/task.validators');

// Turns "12" into 12. Returns null if it is not a positive whole number.
const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Turns "2026-10-08" into a Date. Empty or missing becomes null.
const toDate = (value) => (value ? new Date(value) : null);

// Each task is returned together with the name of its project.
const withProject = { project: { select: { id: true, name: true } } };

const filterError = (path, message) => ({
  message: 'Invalid filter',
  errors: [{ path, message }],
});

// GET /api/tasks?projectId=1&search=abc&status=PENDING&priority=HIGH
const getTasks = async (req, res, next) => {
  try {
    const { search, status, priority, projectId } = req.query;

    // Only tasks whose project belongs to this user
    const where = { project: { userId: req.user.id } };

    if (projectId !== undefined) {
      const pid = parseId(projectId);
      if (!pid) {
        return res
          .status(400)
          .json(filterError('projectId', 'Project id must be a positive whole number'));
      }
      where.projectId = pid;
    }

    if (typeof search === 'string' && search.trim() !== '') {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    if (status !== undefined) {
      const parsed = taskStatus.safeParse(status);
      if (!parsed.success) {
        return res
          .status(400)
          .json(filterError('status', 'Status must be PENDING, IN_PROGRESS or COMPLETED'));
      }
      where.status = parsed.data;
    }

    if (priority !== undefined) {
      const parsed = priorityEnum.safeParse(priority);
      if (!parsed.success) {
        return res
          .status(400)
          .json(filterError('priority', 'Priority must be LOW, MEDIUM or HIGH'));
      }
      where.priority = parsed.data;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: withProject,
    });

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid task id' });

    // Ownership is checked through task > project > user
    const task = await prisma.task.findFirst({
      where: { id, project: { userId: req.user.id } },
      include: withProject,
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { projectId, name, description, priority, status, dueDate } = req.body;

    // The project must exist AND belong to this user, otherwise 404
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = await prisma.task.create({
      data: {
        projectId,
        name,
        description: description ?? null,
        priority, // if missing, the database default (MEDIUM) is used
        status, // if missing, the database default (PENDING) is used
        dueDate: toDate(dueDate),
      },
      include: withProject,
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id  (also used to mark a task completed: { "status": "COMPLETED" })
const updateTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid task id' });

    const existing = await prisma.task.findFirst({
      where: { id, project: { userId: req.user.id } },
    });
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    const body = req.body;
    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.status !== undefined) data.status = body.status;
    if (body.dueDate !== undefined) data.dueDate = toDate(body.dueDate);

    const task = await prisma.task.update({
      where: { id },
      data,
      include: withProject,
    });

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid task id' });

    const existing = await prisma.task.findFirst({
      where: { id, project: { userId: req.user.id } },
    });
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    await prisma.task.delete({ where: { id } });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
};