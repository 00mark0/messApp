// api/middleware/errorHandler.js

// Error handling middleware function
const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace to the console
  res.status(500).json({ error: err.message }); // Send a 500 Internal Server Error response with the error message
};

export default errorHandler; // Export the error handler to be used in other parts of the application
