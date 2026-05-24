/**
 * Global Error Handling Middleware
 * Centralizes Express errors, formats standard JSON responses, maps database-specific exceptions,
 * and hides raw system stack traces in production to secure the application.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[ErrorMiddleware] Intercepted error:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Handle Mongoose CastError (e.g. invalid MongoDB ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier format: ${err.value}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((el) => el.message);
  }

  // Handle MongoDB Duplicate Key Error (e.g. unique field conflicts)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate field value entered: ${field}`;
  }

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
