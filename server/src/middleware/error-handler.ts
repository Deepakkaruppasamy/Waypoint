import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors';

export const routeNotFound: RequestHandler = (req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}` });
};

/** Turns any thrown error into a consistent JSON response: { message, details? } */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Some fields are missing or invalid.',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ message: 'The request body is not valid JSON.' });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
};
