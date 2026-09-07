// Vercel serverless entry point.
// Vercel routes /api/* here and renders our Express app as a function.
const app = require('../src/app');

module.exports = app;
