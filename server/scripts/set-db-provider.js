#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

const provider = process.argv[2] || process.env.DB_TYPE || process.env.DB_PROVIDER || 'sqlite';
const validProviders = ['sqlite', 'mysql', 'postgresql'];

if (!validProviders.includes(provider)) {
  console.error(`Invalid DB provider: ${provider}. Must be one of: ${validProviders.join(', ')}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf-8');

schema = schema.replace(
  /provider\s*=\s*"(sqlite|mysql|postgresql)"/,
  `provider = "${provider}"`
);

if (provider === 'sqlite') {
  schema = schema.replace(/\s+@db\.Text/g, '');
}

fs.writeFileSync(schemaPath, schema, 'utf-8');
console.log(`Prisma schema provider set to: ${provider}`);
