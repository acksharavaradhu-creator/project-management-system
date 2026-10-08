const { z } = require('zod');
const { dateString } = require('./project.validators');

const priority = z.enum(['LOW', 'MEDIUM', 'HIGH'], {
  message: 'Priority must be LOW, MEDIUM or HIGH',
});

const taskStatus = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
  message: 'Status must be PENDING, IN_PROGRESS or COMPLETED',
});

const fields = {
  name: z
    .string({ message: 'Task name is required' })
    .trim()
    .min(1, 'Task name cannot be empty')
    .max(100, 'Task name must be 100 characters or less'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be 1000 characters or less')
    .nullable()
    .optional(),
  priority: priority.optional(),
  status: taskStatus.optional(),
  dueDate: dateString.nullable().optional(),
};

// When creating a task, the project it belongs to is required.
const createTaskSchema = z.object({
  projectId: z
    .number({ message: 'Project id is required and must be a number' })
    .int('Project id must be a whole number')
    .positive('Project id must be positive'),
  ...fields,
});

// For editing: every field is optional, but at least one must be sent.
// projectId is not accepted here, so a task cannot be moved to another project.
const updateTaskSchema = z
  .object(fields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Send at least one field to update',
  });

module.exports = { createTaskSchema, updateTaskSchema, taskStatus, priority };