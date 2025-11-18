// Express API with JWT auth: registration (18–90 age), login, admin-only lists/search/stats/update/delete, file utilities
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import {
  initializeDatabase,
  insertRegistration,
  getAllRegistrations,
  getRegistrationById,
  getRegistrationByEmail,
  updateRegistration,
  deleteRegistration,
  searchRegistrations,
  getRegistrationStats,
  getRegistrationsPaginated,
  getUserByEmail
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads dir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer for uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Init DB
initializeDatabase().catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

// ---------- Auth helpers ----------
function auth(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// ---------- Login (issues JWT) ----------
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ message: 'Login successful', token, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------- Registrations ----------
app.post('/api/registrations', async (req, res) => {
  try {
    const {
      first_name, last_name, age, email, mobile, address, unit_in_BEC,
      password, confirm_password, role
    } = req.body || {};

    if (!first_name || !last_name || !age || !email || !mobile || !address || !unit_in_BEC || !password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const nAge = parseInt(age, 10);
    if (isNaN(nAge) || nAge < 18 || nAge > 90) {
      return res.status(400).json({ error: 'Age must be between 18 and 90' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match' });

    const existing = await getRegistrationByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    let newRole = 'user';
    try {
      const hdr = req.headers.authorization || '';
      const t = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (t) {
        const dec = jwt.verify(t, JWT_SECRET);
        if (dec?.role === 'admin' && role === 'admin') newRole = 'admin';
      }
    } catch { /* remain 'user' */ }

    const result = await insertRegistration({
      first_name, last_name, age: nAge, email, mobile, address, unit_in_BEC,
      password: hash, confirm_password: hash, role: newRole
    });

    res.status(201).json({ message: 'Registration successful', id: result.id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Admin-only: list
app.get('/api/registrations', auth('admin'), async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    if (page && limit) return res.json(await getRegistrationsPaginated(page, limit));
    res.json({ data: await getAllRegistrations() });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

app.get('/api/registrations/:id', auth('admin'), async (req, res) => {
  try {
    const row = await getRegistrationById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Registration not found' });
    res.json({ data: row });
  } catch {
    res.status(500).json({ error: 'Failed to fetch registration' });
  }
});

app.put('/api/registrations/:id', auth('admin'), async (req, res) => {
  try {
    const result = await updateRegistration(req.params.id, req.body);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Registration not found' });
    res.json({ message: 'Registration updated' });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/registrations/:id', auth('admin'), async (req, res) => {
  try {
    const result = await deleteRegistration(req.params.id);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Registration not found' });
    res.json({ message: 'Registration deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/api/registrations/search/:query', auth('admin'), async (req, res) => {
  try {
    res.json({ data: await searchRegistrations(req.params.query) });
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/registrations-stats', auth('admin'), async (_req, res) => {
  try {
    res.json({ data: await getRegistrationStats() });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ---------- File utilities ----------
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ message: 'File uploaded', filename: req.file.filename, fileType: path.extname(req.file.originalname) });
});

app.get('/data/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  try {
    const ext = path.extname(filePath).toLowerCase();
    let parsed;
    if (ext === '.csv' || ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      parsed = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((o, h, i) => (o[h] = values[i] || '', o), {});
      });
    } else if (ext === '.json') {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      parsed = Array.isArray(json) ? json : json.data || [json];
    } else if (ext === '.xlsx' || ext === '.xls') {
      const wb = XLSX.readFile(filePath);
      parsed = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    } else return res.status(400).json({ error: 'Unsupported file type' });
    res.json({ data: parsed });
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: 'Failed to parse file' });
  }
});

app.get('/stats/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  try {
    const ext = path.extname(filePath).toLowerCase();
    let data = [];
    if (ext === '.csv' || ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((o, h, i) => (o[h] = values[i] || '', o), {});
      });
    } else if (ext === '.json') {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data = Array.isArray(json) ? json : [json];
    } else if (ext === '.xlsx' || ext === '.xls') {
      const wb = XLSX.readFile(filePath);
      data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
    const columnStats = {};
    if (data.length) {
      const headers = Object.keys(data[0]);
      headers.forEach(h => {
        const values = data.map(r => r[h]).filter(v => v != null && v !== '');
        const nums = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
        if (nums.length > values.length * 0.5) {
          const sorted = [...nums].sort((a, b) => a - b);
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
          columnStats[h] = {
            count: nums.length,
            mean,
            median: sorted[Math.floor(sorted.length / 2)],
            stdDev: Math.sqrt(nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nums.length),
            min: Math.min(...nums),
            max: Math.max(...nums)
          };
        } else {
          columnStats[h] = { count: values.length, unique: new Set(values).size };
        }
      });
    }
    res.json({ columnStats });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: 'If email exists, reset instructions will be sent' });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link (use nodemailer or similar)
    // For now, just log it
    console.log(`Reset link: http://localhost:3001/reset-password?token=${resetToken}`);

    res.json({ message: 'Password reset instructions sent to email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE regNew SET password=?, confirm_password=? WHERE id=?',
      [hash, hash, decoded.id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));