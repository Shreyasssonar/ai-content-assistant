/**
 * src/config/prisma.js
 *
 * Singleton Prisma client.
 * Exporting from one place ensures only one connection pool exists for the
 * lifetime of the process, and makes it easy to swap in a mock during tests.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
