const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/project.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createProjectSchema,
  updateProjectSchema,
} = require('../validators/project.validators');

const router = express.Router();

// Every project route needs a logged-in user
router.use(authenticate);

router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', validate(createProjectSchema), createProject);
router.put('/:id', validate(updateProjectSchema), updateProject);
router.delete('/:id', deleteProject);

module.exports = router;