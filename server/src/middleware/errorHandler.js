export default function errorHandler(error, _request, response, _next) {
  const isClientError = error.type === 'entity.parse.failed'
    || error.name === 'ValidationError'
    || error.name === 'CastError'
  const status = isClientError ? 400 : 500

  if (status === 500) console.error(error)
  response.status(status).json({
    success: false,
    message: status === 400 ? 'The request contains invalid data.' : 'An unexpected server error occurred.',
  })
}