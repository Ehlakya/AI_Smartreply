/**
 * Standardize API responses
 */

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const response = {
    status: 'success',
    message,
  };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  const response = {
    status: 'error',
    message,
  };
  if (errors !== null) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, message, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    pagination,
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};
