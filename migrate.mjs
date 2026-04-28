import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  let connection;
  try {
    console.log('Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'bid_automation',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    console.log('✓ Connected to database');
    console.log('Reading migration file...');
    
    const migrationPath = path.join(__dirname, 'drizzle/0005_cool_colossus.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Found ${statements.length} statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}:`);
      console.log(`  ${statement.substring(0, 80)}...`);
      
      try {
        await connection.execute(statement);
        console.log(`  ✓ Success\n`);
      } catch (error) {
        console.error(`  ✗ Failed: ${error.message}\n`);
        // Continue with next statement even if one fails
      }
    }

    console.log('✓ Migration completed!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigration();
