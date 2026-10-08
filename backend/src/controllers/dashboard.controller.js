const prisma = require('../config/db');

// GET /api/dashboard
// Counts only the data that belongs to the logged-in user.
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      projectsInProgress,
    ] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.task.count({ where: { project: { userId } } }),
      prisma.task.count({
        where: { project: { userId }, status: 'COMPLETED' },
      }),
      prisma.task.count({
        where: { project: { userId }, status: 'PENDING' },
      }),
      prisma.project.count({ where: { userId, status: 'IN_PROGRESS' } }),
    ]);

    res.json({
      dashboard: {
        totalProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        projectsInProgress,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };