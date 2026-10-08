// Runs when no route matched the requested URL
function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

// Runs whenever a controller calls next(err) or something throws
// It must have exactly 4 parameters, or Express will not treat it as an error handler
function errorHandler(err, req, res, next) {
  // If a response was already started, let Express finish it
  if (res.headersSent) {
    return next(err);
  }

  // Request body was not valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }

  // Request body was bigger than the 10kb limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }

  // Prisma: the record to update or delete was not found
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  // Prisma: a unique value (like an email) already exists
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this value already exists' });
  }

  // Anything else: log the real error on the server, send a safe message to the client
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}

module.exports = { notFound, errorHandler };