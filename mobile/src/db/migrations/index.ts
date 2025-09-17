import initialMigration from './0001_initial';
import type { Migration } from '@/db/types/migration';

export const MIGRATIONS: Migration[] = [initialMigration];
