import { getDb } from './db';

async function runMigration() {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  try {
    const connection = (db as any).$client;
    
    const migrations = [
      'ALTER TABLE `bids` ADD `projectName` varchar(255) NOT NULL',
      'ALTER TABLE `bids` ADD `projectAddress` varchar(255) NOT NULL',
      'ALTER TABLE `bids` ADD `projectSqft` int',
      'ALTER TABLE `bids` ADD `crewDays` int NOT NULL',
      'ALTER TABLE `bids` ADD `crewPeople` int NOT NULL',
      'ALTER TABLE `bids` ADD `isPrivateWage` int DEFAULT 1 NOT NULL',
      'ALTER TABLE `bids` ADD `travelDistance` int',
      'ALTER TABLE `bids` ADD `additionalCosts` int',
      'ALTER TABLE `bids` ADD `includeWaxing` int DEFAULT 0 NOT NULL',
      'ALTER TABLE `bids` ADD `includeCarpet` int DEFAULT 0 NOT NULL',
      'ALTER TABLE `bids` ADD `includeWindows` int DEFAULT 0 NOT NULL',
      'ALTER TABLE `bids` DROP COLUMN `wageType`',
      'ALTER TABLE `bids` DROP COLUMN `includeTravel`',
    ];

    for (const sql of migrations) {
      try {
        console.log(`Executing: ${sql}`);
        await connection.promise().query(sql);
        console.log('✓ Success');
      } catch (error: any) {
        // Ignore "column already exists" or "column doesn't exist" errors
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`⚠ Skipped (already exists or doesn't exist): ${error.message}`);
        } else {
          console.error(`✗ Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
