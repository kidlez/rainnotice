#!/usr/bin/env node
const path = require('path');
const base = path.resolve(__dirname, '..', '.dist');
require(path.join(base, 'mcp', 'server.js'));
