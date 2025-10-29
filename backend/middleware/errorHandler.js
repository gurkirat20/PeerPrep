import mongoose from 'mongoose';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

// Main error handling middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// Async error wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Validation error handler
export const handleValidationError = (errors) => {
  const formattedErrors = errors.array().map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));
  
  return new AppError(`Validation failed: ${formattedErrors.map(e => e.message).join(', ')}`, 400);
};

// Database connection error handler
export const handleDBError = (err) => {
  if (err instanceof mongoose.Error.CastError) {
    return handleCastErrorDB(err);
  }
  if (err.code === 11000) {
    return handleDuplicateFieldsDB(err);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return handleValidationErrorDB(err);
  }
  return err;
};

// Socket error handler
export const handleSocketError = (socket, error) => {
  console.error('Socket error:', error);
  
  const errorMessage = error.isOperational ? error.message : 'Something went wrong';
  
  socket.emit('error', {
    success: false,
    message: errorMessage,
    code: error.statusCode || 500
  });
};

// Rate limit error handler
export const handleRateLimitError = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: req.rateLimit?.resetTime || 60
  });
};

// CORS error handler
export const handleCORSError = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  } else {
    next(err);
  }
};

// File upload error handler
export const handleFileUploadError = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      message: 'File too large'
    });
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    res.status(413).json({
      success: false,
      message: 'Too many files'
    });
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  } else {
    next(err);
  }
};

export default {
  AppError,
  errorHandler,
  catchAsync,
  notFound,
  handleValidationError,
  handleDBError,
  handleSocketError,
  handleRateLimitError,
  handleCORSError,
  handleFileUploadError
};