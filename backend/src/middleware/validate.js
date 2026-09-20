/**
 * src/middleware/validate.js
 *
 * Reusable Zod validation middleware factory.
 *
 * Usage:
 *   import { validate } from '../middleware/validate.js';
 *   import { CreateEntrySchema } from '../routes/entries.js';
 *
 *   router.post('/', validate(CreateEntrySchema), entriesController.create);
 *
 * On failure, passes a ZodError to the next error handler which returns a 400.
 */

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate req.body against
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(result.error); // ZodError → caught by errorHandler
    }
    req.body = result.data; // replace body with parsed/coerced data
    next();
  };
}
