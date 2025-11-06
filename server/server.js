// server/server.js
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ensure upload dir exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// POST /upload with field name 'file'
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    ok: true,
    field: 'file',
    savedAs: req.file.filename,
    size: req.file.size,
    path: req.file.path
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Upload server running on http://localhost:${PORT}`));

// // server/server.js
// require('dotenv').config();

// const path = require('path');
// const fs = require('fs');
// const express = require('express');
// const multer = require('multer');

// const app = express();
// const port = process.env.PORT || 4000;

// // Resolve upload dir from .env (relative to project root)
// const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'server/uploads');

// // Ensure the directory exists
// fs.mkdirSync(uploadDir, { recursive: true });

// // Basic middlewares
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Configure multer storage
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, uploadDir),
//   filename: (_req, file, cb) => {
//     const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     const ext = path.extname(file.originalname);
//     cb(null, `${file.fieldname}-${unique}${ext}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit (tweak as needed)
// });

// // Health check
// app.get('/health', (_req, res) => {
//   res.json({ ok: true, uploadDir });
// });

// // Single-file upload (form field name: "file")
// app.post('/upload', upload.single('file'), (req, res) => {
//   res.json({
//     ok: true,
//     file: {
//       original: req.file.originalname,
//       savedAs: req.file.filename,
//       size: req.file.size,
//       path: req.file.path,
//       url: `/uploads/${req.file.filename}`,
//     },
//   });
// });

// // Serve uploaded files statically
// app.use('/uploads', express.static(uploadDir));

// app.listen(port, () => {
//   console.log(`Server listening on http://localhost:${port}`);
// });



// require('dotenv').config();
// const path = require('path');
// const fs = require('fs');
// const express = require('express');
// const cors = require('cors');
// const multer = require('multer');
// const xlsx = require('xlsx');
// const { parse } = require('csv-parse/sync');
// const { pool } = require('./db');
// const { calculateAdvancedStatistics } = require('./stats');

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: '10mb' }));

// // uploads
// const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, uploadDir),
//   filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
// });
// const upload = multer({ storage });

// function readFileToRows(filePath) {
//   const ext = path.extname(filePath).toLowerCase();
//   if (ext === '.csv') {
//     const content = fs.readFileSync(filePath, 'utf8');
//     const records = parse(content, { columns: true, skip_empty_lines: true });
//     return records;
//   }
//   // xlsx/xls
//   const wb = xlsx.readFile(filePath);
//   const ws = wb.Sheets[wb.SheetNames[0]];
//   return xlsx.utils.sheet_to_json(ws);
// }

// /**
//  * POST /api/upload
//  * multipart/form-data: file
//  * returns: { datasetId, fileName, data (array), statistics }
//  */
// app.post('/api/upload', upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

//     const rows = readFileToRows(req.file.path);
//     const statistics = calculateAdvancedStatistics(rows);

//     // persist dataset + preview + stats
//     const [result] = await pool.execute(
//       `INSERT INTO datasets (original_name, storage_path, row_count) VALUES (?,?,?)`,
//       [req.file.originalname, req.file.path, rows.length]
//     );
//     const datasetId = result.insertId;

//     const previewRows = rows.slice(0, 200); // limit preview
//     await pool.execute(
//       `INSERT INTO dataset_preview (dataset_id, preview_json) VALUES (?,?)`,
//       [datasetId, JSON.stringify(previewRows)]
//     );
//     await pool.execute(
//       `INSERT INTO dataset_statistics (dataset_id, stats_json) VALUES (?,?)`,
//       [datasetId, JSON.stringify(statistics)]
//     );

//     res.json({
//       datasetId,
//       fileName: req.file.originalname,
//       data: previewRows,           // feed the UI
//       statistics                   // feed the UI
//     });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Failed to process file' });
//   }
// });

// /**
//  * GET /api/datasets/:id
//  * returns: { data, statistics, meta }
//  */
// app.get('/api/datasets/:id', async (req, res) => {
//   try {
//     const id = req.params.id;
//     const [[meta]] = await pool.query(`SELECT * FROM datasets WHERE id=?`, [id]);
//     if (!meta) return res.status(404).json({ message: 'Not found' });

//     const [[preview]] = await pool.query(`SELECT preview_json FROM dataset_preview WHERE dataset_id=?`, [id]);
//     const [[stats]] = await pool.query(`SELECT stats_json FROM dataset_statistics WHERE dataset_id=?`, [id]);

//     res.json({
//       meta,
//       data: JSON.parse(preview.preview_json),
//       statistics: JSON.parse(stats.stats_json)
//     });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Error loading dataset' });
//   }
// });

// /**
//  * Presets (optional)
//  */
// app.get('/api/presets', async (_req, res) => {
//   const [rows] = await pool.query(`SELECT id, name, config_json, created_at FROM presets ORDER BY id DESC`);
//   res.json(rows.map(r => ({ ...r, config_json: JSON.parse(r.config_json) })));
// });

// app.post('/api/presets', async (req, res) => {
//   const { name, config } = req.body || {};
//   if (!name || !config) return res.status(400).json({ message: 'name & config required' });
//   const [r] = await pool.execute(
//     `INSERT INTO presets (name, config_json) VALUES (?,?)`,
//     [name, JSON.stringify(config)]
//   );
//   res.json({ id: r.insertId, name, config });
// });

// const port = process.env.PORT || 4000;
// app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
