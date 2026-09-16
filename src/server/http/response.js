import 'server-only';

// Small response adapter keeps the original service status/error precedence.
export function createResponse() {
  return {
    statusCode: 200,
    headers: new Headers(),
    response: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers.set(name, String(value)); },
    getHeader(name) { return this.headers.get(name); },
    json(data) {
      this.response = Response.json(data, { status: this.statusCode, headers: this.headers });
      return this.response;
    },
    send(data) {
      this.headers.set('Content-Type', 'text/html; charset=utf-8');
      this.response = new Response(data, { status: this.statusCode, headers: this.headers });
      return this.response;
    },
  };
}

export function errorResponse(err, res) {
  let status = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    status = 404;
    message = 'Resource not found';
  }
  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate ${field}: ${err.keyValue[field]} already exists`;
  }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }
  return res.status(status).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}
