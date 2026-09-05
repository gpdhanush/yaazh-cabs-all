function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  console.error('[ERROR]', {
    request_id: req.requestId,
    method: req.method,
    path: req.originalUrl,
    code: error.code,
    message: error.message
  });
  const statusCode = error.statusCode || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  const message = statusCode === 500 ? 'Internal server error.' : error.message;
  return res.status(statusCode).json({ success: false, message, request_id: req.requestId });
}

module.exports = errorHandler;