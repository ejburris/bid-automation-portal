import { getDb } from './db.ts';

const db = getDb();

const statements = [
  'ALTER TABLE `bids` ADD `waxingSqft` int;',
  'ALTER TABLE `bids` ADD `carpetSqft` int;',
  'ALTER TABLE `bids` ADD `windowCount` int;',
  'ALTER TABLE `bids` ADD `floorCount` int;',
  'ALTER TABLE `bids` ADD `needsAerialLift` int DEFAULT 0 NOT NULL;',
  'ALTER TABLE `bids` ADD `aerialLiftCost` int;',
];

for (const stmt of statements) {
  try {
    await db.execute(stmt);
    console.log(`✓ ${stmt}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`⊘ Column already exists`);
    } else {
      console.error(`Error: ${err.message}`);
    }
  }
}

console.log('Migration completed');
process.exit(0);
