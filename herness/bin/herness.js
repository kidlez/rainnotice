#!/usr/bin/env node
const { main } = require('../.dist/lib/cli/index')
main(process.argv.slice(2)).catch((err) => {
  console.error('herness:', err.message)
  process.exit(1)
})
