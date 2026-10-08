const { z } = require('zod');

// A date sent as text like "2026-10-07". Rejects impossible dates like 2026-02-30.
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Date is not a real calendar date');

const projectStatus = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'], {
  message: 'Status must be NOT_STARTED, IN_PROGRESS or COMPLETED',
});

const fields = {
  name: z
    .string({ message: 'Project name is required' })
    .trim()
    .min(1, 'Project name cannot be empty')
    .max(100, 'Project name must be 100 characters or less'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be 1000 characters or less')
    .nullable()
    .optional(),
  status: projectStatus.optional(),
  startDate: dateString.nullable().optional(),
  endDate: dateString.nullable().optional(),
};

// End date must not be before start date (only checked when both are sent).
const endAfterStart = (data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
};
const endAfterStartMessage = {
  message: 'End date cannot be before start date',
  path: ['endDate'],
};

const createProjectSchema = z.object(fields).refine(endAfterStart, endAfterStartMessage);

// For editing: every field is optional, but at least one must be sent.
const updateProjectSchema = z
  .object(fields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Send at least one field to update',
  })
  .refine(endAfterStart, endAfterStartMessage);

module.exports = { createProjectSchema, updateProjectSchema, projectStatus, dateString };