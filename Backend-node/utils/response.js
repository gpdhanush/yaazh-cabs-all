function success(res, data = {}, message = 'Request successful', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function failure(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

module.exports = { success, failure };