import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Log config for debugging (mask password)
console.log('DB Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***LOADED***' : 'MISSING',
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const DB_NAME = process.env.DB_NAME || 'becDB1';

// Create connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // PlanetScale requires SSL
  ssl: process.env.DB_HOST?.includes('planetscale') ? { rejectUnauthorized: true } : undefined
});

/**
 * Initialize database: create table and ensure columns exist
 * Note: PlanetScale doesn't support CREATE DATABASE - database must exist
 */
export async function initializeDatabase() {
  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS regNew (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        age INT NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        mobile VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        unit_in_BEC VARCHAR(100) NOT NULL,
        role VARCHAR(10) NOT NULL DEFAULT 'user',
        password VARCHAR(255) NOT NULL,
        confirm_password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_unit (unit_in_BEC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table regNew checked/created');

    // Check existing columns and add missing ones
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME='regNew'`,
      [DB_NAME]
    );
    
    const existingColumns = new Set(cols.map(c => c.COLUMN_NAME));

    if (!existingColumns.has('role')) {
      await pool.query(`ALTER TABLE regNew ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user' AFTER unit_in_BEC`);
      console.log('Added column: role');
    }
    
    if (!existingColumns.has('password')) {
      await pool.query(`ALTER TABLE regNew ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''`);
      console.log('Added column: password');
    }
    
    if (!existingColumns.has('confirm_password')) {
      await pool.query(`ALTER TABLE regNew ADD COLUMN confirm_password VARCHAR(255) NOT NULL DEFAULT ''`);
      console.log('Added column: confirm_password');
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

/**
 * Insert a new registration
 */
export async function insertRegistration({
  first_name, last_name, age, email, mobile, address, unit_in_BEC, 
  password, confirm_password, role = 'user'
}) {
  const [result] = await pool.query(
    `INSERT INTO regNew
     (first_name, last_name, age, email, mobile, address, unit_in_BEC, role, password, confirm_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, age, email, mobile, address, unit_in_BEC, role, password, confirm_password]
  );
  return { id: result.insertId };
}

/**
 * Get all registrations (exclude passwords)
 */
export async function getAllRegistrations() {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
     FROM regNew ORDER BY created_at DESC`
  );
  return rows;
}

/**
 * Get paginated registrations
 */
export async function getRegistrationsPaginated(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
     FROM regNew ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM regNew`);
  const total = countResult[0].total || 0;
  
  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

/**
 * Get registration by ID (exclude passwords)
 */
export async function getRegistrationById(id) {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
     FROM regNew WHERE id=?`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Get registration by email (exclude passwords)
 */
export async function getRegistrationByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
     FROM regNew WHERE email=?`,
    [email]
  );
  return rows[0] || null;
}

/**
 * Get user by email for authentication (includes password)
 */
export async function getUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, email, password, first_name, last_name, role 
     FROM regNew WHERE email=?`,
    [email]
  );
  return rows[0] || null;
}

/**
 * Update registration (including password fields if provided)
 */
export async function updateRegistration(id, data) {
  const fields = [];
  const values = [];

  // Build dynamic UPDATE query based on provided fields
  if (data.first_name !== undefined) { fields.push('first_name=?'); values.push(data.first_name); }
  if (data.last_name !== undefined) { fields.push('last_name=?'); values.push(data.last_name); }
  if (data.age !== undefined) { fields.push('age=?'); values.push(data.age); }
  if (data.email !== undefined) { fields.push('email=?'); values.push(data.email); }
  if (data.mobile !== undefined) { fields.push('mobile=?'); values.push(data.mobile); }
  if (data.address !== undefined) { fields.push('address=?'); values.push(data.address); }
  if (data.unit_in_BEC !== undefined) { fields.push('unit_in_BEC=?'); values.push(data.unit_in_BEC); }
  if (data.role !== undefined) { fields.push('role=?'); values.push(data.role); }
  if (data.password !== undefined) { fields.push('password=?'); values.push(data.password); }
  if (data.confirm_password !== undefined) { fields.push('confirm_password=?'); values.push(data.confirm_password); }

  if (fields.length === 0) {
    return { affectedRows: 0 };
  }

  values.push(id);
  const [result] = await pool.query(
    `UPDATE regNew SET ${fields.join(', ')} WHERE id=?`,
    values
  );
  
  return { affectedRows: result.affectedRows };
}

/**
 * Delete registration
 */
export async function deleteRegistration(id) {
  const [result] = await pool.query(`DELETE FROM regNew WHERE id=?`, [id]);
  return { affectedRows: result.affectedRows };
}

/**
 * Search registrations by query string
 */
export async function searchRegistrations(query) {
  const like = `%${query}%`;
  
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
     FROM regNew
     WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR unit_in_BEC LIKE ?
     ORDER BY created_at DESC LIMIT 100`,
    [like, like, like, like]
  );
  
  return rows;
}

/**
 * Get registration statistics
 */
export async function getRegistrationStats() {
  const [totalResult] = await pool.query(`SELECT COUNT(*) AS total FROM regNew`);
  const [byUnit] = await pool.query(
    `SELECT unit_in_BEC, COUNT(*) AS count 
     FROM regNew 
     GROUP BY unit_in_BEC 
     ORDER BY count DESC`
  );
  
  return {
    total: totalResult[0]?.total || 0,
    byUnit
  };
}

// import mysql from 'mysql2/promise';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import dotenv from 'dotenv';

// // Load .env from server directory
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.join(__dirname, '.env') });

// // Log config for debugging (mask password)
// console.log('DB Config:', {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD ? '***LOADED***' : 'MISSING',
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT
// });

// const DB_NAME = process.env.DB_NAME || 'becDB1';

// // Create connection pool
// export const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: DB_NAME,
//   port: Number(process.env.DB_PORT || 3306),
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// /**
//  * Initialize database: create DB if missing, create table, ensure columns exist
//  */
// export async function initializeDatabase() {
//   try {
//     // Step 1: Create database if it doesn't exist (without selecting a database)
//     const bootstrap = await mysql.createConnection({
//       host: process.env.DB_HOST || 'localhost',
//       user: process.env.DB_USER || 'root',
//       password: process.env.DB_PASSWORD || '',
//       port: Number(process.env.DB_PORT || 3306)
//     });
    
//     await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
//     console.log(`Database '${DB_NAME}' checked/created`);
//     await bootstrap.end();

//     // Step 2: Create table if it doesn't exist
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS regNew (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         first_name VARCHAR(100) NOT NULL,
//         last_name VARCHAR(100) NOT NULL,
//         age INT NOT NULL,
//         email VARCHAR(255) NOT NULL UNIQUE,
//         mobile VARCHAR(50) NOT NULL,
//         address TEXT NOT NULL,
//         unit_in_BEC VARCHAR(100) NOT NULL,
//         role VARCHAR(10) NOT NULL DEFAULT 'user',
//         password VARCHAR(255) NOT NULL,
//         confirm_password VARCHAR(255) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         INDEX idx_email (email),
//         INDEX idx_unit (unit_in_BEC)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `);
//     console.log('Table regNew checked/created');

//     // Step 3: Check existing columns and add missing ones
//     const [cols] = await pool.query(
//       `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
//        WHERE TABLE_SCHEMA=? AND TABLE_NAME='regNew'`,
//       [DB_NAME]
//     );
    
//     const existingColumns = new Set(cols.map(c => c.COLUMN_NAME));

//     if (!existingColumns.has('role')) {
//       await pool.query(`ALTER TABLE regNew ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user' AFTER unit_in_BEC`);
//       console.log('Added column: role');
//     }
    
//     if (!existingColumns.has('password')) {
//       await pool.query(`ALTER TABLE regNew ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''`);
//       console.log('Added column: password');
//     }
    
//     if (!existingColumns.has('confirm_password')) {
//       await pool.query(`ALTER TABLE regNew ADD COLUMN confirm_password VARCHAR(255) NOT NULL DEFAULT ''`);
//       console.log('Added column: confirm_password');
//     }

//     console.log('Database initialized successfully');
//   } catch (err) {
//     console.error('Database initialization error:', err);
//     throw err;
//   }
// }

// /**
//  * Insert a new registration
//  */
// export async function insertRegistration({
//   first_name, last_name, age, email, mobile, address, unit_in_BEC, 
//   password, confirm_password, role = 'user'
// }) {
//   const [result] = await pool.query(
//     `INSERT INTO regNew
//      (first_name, last_name, age, email, mobile, address, unit_in_BEC, role, password, confirm_password)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [first_name, last_name, age, email, mobile, address, unit_in_BEC, role, password, confirm_password]
//   );
//   return { id: result.insertId };
// }

// /**
//  * Get all registrations (exclude passwords)
//  */
// export async function getAllRegistrations() {
//   const [rows] = await pool.query(
//     `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
//      FROM regNew ORDER BY created_at DESC`
//   );
//   return rows;
// }

// /**
//  * Get paginated registrations
//  */
// export async function getRegistrationsPaginated(page = 1, limit = 10) {
//   const offset = (page - 1) * limit;
  
//   const [rows] = await pool.query(
//     `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
//      FROM regNew ORDER BY created_at DESC LIMIT ? OFFSET ?`,
//     [limit, offset]
//   );
  
//   const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM regNew`);
//   const total = countResult[0].total || 0;
  
//   return {
//     data: rows,
//     pagination: {
//       total,
//       page,
//       limit,
//       totalPages: Math.max(1, Math.ceil(total / limit))
//     }
//   };
// }

// /**
//  * Get registration by ID (exclude passwords)
//  */
// export async function getRegistrationById(id) {
//   const [rows] = await pool.query(
//     `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
//      FROM regNew WHERE id=?`,
//     [id]
//   );
//   return rows[0] || null;
// }

// /**
//  * Get registration by email (exclude passwords)
//  */
// export async function getRegistrationByEmail(email) {
//   const [rows] = await pool.query(
//     `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
//      FROM regNew WHERE email=?`,
//     [email]
//   );
//   return rows[0] || null;
// }

// /**
//  * Get user by email for authentication (includes password)
//  */
// export async function getUserByEmail(email) {
//   const [rows] = await pool.query(
//     `SELECT id, email, password, first_name, last_name, role 
//      FROM regNew WHERE email=?`,
//     [email]
//   );
//   return rows[0] || null;
// }

// /**
//  * Update registration
//  */
// export async function updateRegistration(id, data) {
//   const { first_name, last_name, age, email, mobile, address, unit_in_BEC, role } = data;
  
//   const [result] = await pool.query(
//     `UPDATE regNew 
//      SET first_name=?, last_name=?, age=?, email=?, mobile=?, address=?, unit_in_BEC=?, role=? 
//      WHERE id=?`,
//     [first_name, last_name, age, email, mobile, address, unit_in_BEC, role || 'user', id]
//   );
  
//   return { affectedRows: result.affectedRows };
// }

// /**
//  * Delete registration
//  */
// export async function deleteRegistration(id) {
//   const [result] = await pool.query(`DELETE FROM regNew WHERE id=?`, [id]);
//   return { affectedRows: result.affectedRows };
// }

// /**
//  * Search registrations by query string
//  */
// export async function searchRegistrations(query) {
//   const like = `%${query}%`;
  
//   const [rows] = await pool.query(
//     `SELECT id, first_name, last_name, age, email, mobile, address, unit_in_BEC, role, created_at
//      FROM regNew
//      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR unit_in_BEC LIKE ?
//      ORDER BY created_at DESC LIMIT 100`,
//     [like, like, like, like]
//   );
  
//   return rows;
// }

// /**
//  * Get registration statistics
//  */
// export async function getRegistrationStats() {
//   const [totalResult] = await pool.query(`SELECT COUNT(*) AS total FROM regNew`);
//   const [byUnit] = await pool.query(
//     `SELECT unit_in_BEC, COUNT(*) AS count 
//      FROM regNew 
//      GROUP BY unit_in_BEC 
//      ORDER BY count DESC`
//   );
  
//   return {
//     total: totalResult[0]?.total || 0,
//     byUnit
//   };
// }

