// Express server for handling file uploads and data analysis

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx'); // Library for reading Excel files

const app = express();
const PORT = 3000;

// Enable CORS for cross-origin requests from frontend
app.use(cors());
// Parse JSON request bodies
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer with file type validation
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow specific file types
    const allowedTypes = ['.csv', '.json', '.xlsx', '.xls', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    console.log('File upload attempted:', file.originalname, 'Extension:', ext);
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only CSV, JSON, Excel (.xlsx, .xls), and TXT files are allowed. Got: ${ext}`));
    }
  }
});

/**
 * Parse different file types into a common array of objects format
 * @param {string} filePath - Path to the uploaded file
 * @returns {Array} - Array of data objects
 */
function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  console.log('Parsing file:', filePath, 'Type:', ext);

  if (ext === '.json') {
    // Parse JSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    // Handle different JSON structures
    if (Array.isArray(jsonData)) {
      return jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      return jsonData.data;
    } else if (jsonData.rows && Array.isArray(jsonData.rows)) {
      return jsonData.rows;
    }
    // Wrap single object in array
    return [jsonData];
  } else if (ext === '.xlsx' || ext === '.xls') {
    // Parse Excel file using XLSX library
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
  } else if (ext === '.csv' || ext === '.txt') {
    // Parse CSV or TXT file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];
    
    // Detect delimiter (comma for CSV, tab for TXT, or fallback to comma)
    const delimiter = ext === '.csv' ? ',' : /\t/.test(lines[0]) ? '\t' : ',';
    // Extract headers from first line and clean quotes
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    
    // Parse data rows
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"(.*)"$/, '$1'));
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return obj;
    });
  }
  
  throw new Error(`Unsupported file format: ${ext}`);
}

/**
 * POST /upload
 * Handle file upload
 * Returns: { filename, originalName, fileType }
 */
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log('File uploaded successfully:', req.file.filename);
  
  res.json({ 
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileType: path.extname(req.file.originalname).toLowerCase()
  });
});

/**
 * GET /data/:filename
 * Retrieve and parse uploaded file data
 * Returns: { data: Array, fileType: string }
 */
app.get('/data/:filename', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    
    console.log('Data requested for:', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const data = parseFile(filePath);
    res.json({ data, fileType: path.extname(filePath).toLowerCase() });
  } catch (err) {
    console.error('Error parsing file:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /stats/:filename
 * Calculate statistics for each column in the file
 * Returns: { columnStats: Object }
 */
app.get('/stats/:filename', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    
    console.log('Statistics requested for:', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const data = parseFile(filePath);
    if (data.length === 0) {
      return res.json({ columnStats: {} });
    }

    // Get column names from first row
    const headers = Object.keys(data[0]);
    const columnStats = {};

    headers.forEach(header => {
      // Filter out null, undefined, and empty values
      const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
      // Extract numeric values
      const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));

      // Check if column is numeric (more than 50% numeric values)
      if (numericValues.length > values.length * 0.5) {
        // Calculate numeric statistics
        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        const mean = sum / numericValues.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
        const stdDev = Math.sqrt(variance);

        columnStats[header] = {
          count: numericValues.length,
          mean,
          median,
          stdDev,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
        };
      } else {
        // Calculate categorical statistics
        columnStats[header] = {
          count: values.length,
          unique: new Set(values).size,
        };
      }
    });

    res.json({ columnStats });
  } catch (err) {
    console.error('Error calculating statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Supported file types: CSV, JSON, Excel (.xlsx, .xls), TXT`);
});

// // Express server for handling file uploads and data analysis

// const express = require('express');
// const multer = require('multer');
// const cors = require('cors');
// const path = require('path');
// const fs = require('fs');
// const XLSX = require('xlsx'); // Library for reading Excel files

// const app = express();
// const PORT = 3000;

// // Enable CORS for cross-origin requests from frontend
// app.use(cors());
// // Parse JSON request bodies
// app.use(express.json());
// // Serve uploaded files statically
// app.use('/uploads', express.static('uploads'));

// // Create uploads directory if it doesn't exist
// if (!fs.existsSync('uploads')) {
//   fs.mkdirSync('uploads');
// }

// // Configure multer storage for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),
//   filename: (req, file, cb) => {
//     // Generate unique filename with timestamp and random number
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// // Configure multer with file type validation
// const upload = multer({ 
//   storage,
//   fileFilter: (req, file, cb) => {
//     // Only allow specific file types
//     const allowedTypes = ['.csv', '.json', '.xlsx', '.xls', '.txt'];
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (allowedTypes.includes(ext)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Only CSV, JSON, Excel, and TXT files are allowed.'));
//     }
//   }
// });

// /**
//  * Parse different file types into a common array of objects format
//  * @param {string} filePath - Path to the uploaded file
//  * @returns {Array} - Array of data objects
//  */
// function parseFile(filePath) {
//   const ext = path.extname(filePath).toLowerCase();
//   const fileContent = fs.readFileSync(filePath, 'utf-8');

//   if (ext === '.json') {
//     // Parse JSON file
//     const jsonData = JSON.parse(fileContent);
//     // Handle different JSON structures
//     if (Array.isArray(jsonData)) {
//       return jsonData;
//     } else if (jsonData.data && Array.isArray(jsonData.data)) {
//       return jsonData.data;
//     } else if (jsonData.rows && Array.isArray(jsonData.rows)) {
//       return jsonData.rows;
//     }
//     // Wrap single object in array
//     return [jsonData];
//   } else if (ext === '.xlsx' || ext === '.xls') {
//     // Parse Excel file using XLSX library
//     const workbook = XLSX.readFile(filePath);
//     const sheetName = workbook.SheetNames[0]; // Use first sheet
//     const sheet = workbook.Sheets[sheetName];
//     return XLSX.utils.sheet_to_json(sheet);
//   } else if (ext === '.csv' || ext === '.txt') {
//     // Parse CSV or TXT file
//     const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
//     if (lines.length === 0) return [];
    
//     // Detect delimiter (comma for CSV, tab for TXT, or fallback to comma)
//     const delimiter = ext === '.csv' ? ',' : /\t/.test(lines[0]) ? '\t' : ',';
//     // Extract headers from first line and clean quotes
//     const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    
//     // Parse data rows
//     return lines.slice(1).map(line => {
//       const values = line.split(delimiter).map(v => v.trim().replace(/^"(.*)"$/, '$1'));
//       const obj = {};
//       headers.forEach((header, i) => {
//         obj[header] = values[i] || '';
//       });
//       return obj;
//     });
//   }
  
//   throw new Error('Unsupported file format');
// }

// /**
//  * POST /upload
//  * Handle file upload
//  * Returns: { filename, originalName, fileType }
//  */
// app.post('/upload', upload.single('file'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded' });
//   }
//   res.json({ 
//     filename: req.file.filename,
//     originalName: req.file.originalname,
//     fileType: path.extname(req.file.originalname).toLowerCase()
//   });
// });

// /**
//  * GET /data/:filename
//  * Retrieve and parse uploaded file data
//  * Returns: { data: Array, fileType: string }
//  */
// app.get('/data/:filename', (req, res) => {
//   try {
//     const filePath = path.join(__dirname, 'uploads', req.params.filename);
//     if (!fs.existsSync(filePath)) {
//       return res.status(404).json({ error: 'File not found' });
//     }
    
//     const data = parseFile(filePath);
//     res.json({ data, fileType: path.extname(filePath).toLowerCase() });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// /**
//  * GET /stats/:filename
//  * Calculate statistics for each column in the file
//  * Returns: { columnStats: Object }
//  */
// app.get('/stats/:filename', (req, res) => {
//   try {
//     const filePath = path.join(__dirname, 'uploads', req.params.filename);
//     if (!fs.existsSync(filePath)) {
//       return res.status(404).json({ error: 'File not found' });
//     }

//     const data = parseFile(filePath);
//     if (data.length === 0) {
//       return res.json({ columnStats: {} });
//     }

//     // Get column names from first row
//     const headers = Object.keys(data[0]);
//     const columnStats = {};

//     headers.forEach(header => {
//       // Filter out null, undefined, and empty values
//       const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
//       // Extract numeric values
//       const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));

//       // Check if column is numeric (more than 50% numeric values)
//       if (numericValues.length > values.length * 0.5) {
//         // Calculate numeric statistics
//         const sorted = [...numericValues].sort((a, b) => a - b);
//         const sum = numericValues.reduce((acc, val) => acc + val, 0);
//         const mean = sum / numericValues.length;
//         const median = sorted[Math.floor(sorted.length / 2)];
//         const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
//         const stdDev = Math.sqrt(variance);

//         columnStats[header] = {
//           count: numericValues.length,
//           mean,
//           median,
//           stdDev,
//           min: Math.min(...numericValues),
//           max: Math.max(...numericValues),
//         };
//       } else {
//         // Calculate categorical statistics
//         columnStats[header] = {
//           count: values.length,
//           unique: new Set(values).size,
//         };
//       }
//     });

//     res.json({ columnStats });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

// // const express = require('express');
// // const cors = require('cors');
// // const helmet = require('helmet');
// // const morgan = require('morgan');
// // const multer = require('multer');
// // const path = require('path');
// // const fs = require('fs').promises;
// // const { calculateAdvancedStatistics } = require('./stats');

// // // Initialize Express app
// // const app = express();

// // // Configure multer for file uploads
// // const upload = multer({ 
// //     dest: 'uploads/',
// //     fileFilter: (req, file, cb) => {
// //         if (file.mimetype === 'text/csv') {
// //             cb(null, true);
// //         } else {
// //             cb(new Error('Only CSV files are allowed'));
// //         }
// //     }
// // });

// // // Middleware
// // app.use(cors());
// // app.use(helmet());
// // app.use(morgan('dev'));
// // app.use(express.json());

// // // Serve static files from uploads directory
// // app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // // Health check endpoint
// // app.get('/health', (req, res) => {
// //     res.status(200).json({ status: 'ok' });
// // });

// // // File upload endpoint
// // app.post('/upload', upload.single('file'), (req, res) => {
// //     if (!req.file) {
// //         return res.status(400).json({ error: 'No file uploaded' });
// //     }
// //     res.json({ 
// //         ok: true, 
// //         filename: req.file.filename,
// //         originalname: req.file.originalname 
// //     });
// // });

// // // Stats calculation endpoint
// // app.get('/stats/:filename', async (req, res) => {
// //     try {
// //         const filePath = path.join(__dirname, '../uploads', req.params.filename);
// //         const fileContent = await fs.readFile(filePath, 'utf-8');
        
// //         // Parse CSV content
// //         const rows = fileContent.trim().split('\n');
// //         const headers = rows[0].split(',');
// //         const data = rows.slice(1).map(row => {
// //             const values = row.split(',');
// //             return headers.reduce((obj, header, i) => {
// //                 obj[header.trim()] = values[i]?.trim();
// //                 return obj;
// //             }, {});
// //         });

// //         const stats = calculateAdvancedStatistics(data);
// //         res.json(stats);
// //     } catch (error) {
// //         res.status(500).json({ 
// //             error: error.message,
// //             details: 'Error processing file or calculating statistics'
// //         });
// //     }
// // });

// // // Error handling middleware
// // app.use((err, req, res, next) => {
// //     console.error(err.stack);
// //     res.status(500).json({ 
// //         error: err.message,
// //         details: 'Internal server error'
// //     });
// // });

// // // Export for testing
// // module.exports = app;

// // // Start server if running directly
// // if (require.main === module) {
// //     const PORT = process.env.PORT || 3000;
// //     app.listen(PORT, () => {
// //         console.log(`Server running on port ${PORT}`);
// //     });
// // }

// // // const express = require('express');
// // // const cors = require('cors');
// // // const helmet = require('helmet');
// // // const morgan = require('morgan');
// // // const multer = require('multer');
// // // const path = require('path');
// // // const fs = require('fs').promises;
// // // const { calculateAdvancedStatistics } = require('./stats');

// // // // Initialize Express app
// // // const app = express();

// // // // Configure multer for file uploads
// // // const upload = multer({ 
// // //     dest: 'uploads/',
// // //     fileFilter: (req, file, cb) => {
// // //         if (file.mimetype === 'text/csv') {
// // //             cb(null, true);
// // //         } else {
// // //             cb(new Error('Only CSV files are allowed'));
// // //         }
// // //     }
// // // });

// // // // Middleware
// // // app.use(cors());
// // // app.use(helmet());
// // // app.use(morgan('dev'));
// // // app.use(express.json());

// // // // Health check endpoint
// // // app.get('/health', (req, res) => {
// // //     res.status(200).json({ status: 'ok' });
// // // });

// // // // File upload endpoint
// // // app.post('/upload', upload.single('file'), (req, res) => {
// // //     if (!req.file) {
// // //         return res.status(400).json({ error: 'No file uploaded' });
// // //     }
// // //     res.json({ 
// // //         ok: true, 
// // //         filename: req.file.filename,
// // //         originalname: req.file.originalname 
// // //     });
// // // });

// // // // Stats calculation endpoint
// // // app.get('/stats/:filename', async (req, res) => {
// // //     try {
// // //         const filePath = path.join(__dirname, '../uploads', req.params.filename);
// // //         const fileContent = await fs.readFile(filePath, 'utf-8');
        
// // //         // Parse CSV content
// // //         const rows = fileContent.trim().split('\n');
// // //         const headers = rows[0].split(',');
// // //         const data = rows.slice(1).map(row => {
// // //             const values = row.split(',');
// // //             return headers.reduce((obj, header, i) => {
// // //                 obj[header] = values[i];
// // //                 return obj;
// // //             }, {});
// // //         });

// // //         const stats = calculateAdvancedStatistics(data);
// // //         res.json(stats);
// // //     } catch (error) {
// // //         res.status(500).json({ 
// // //             error: error.message,
// // //             details: 'Error processing file or calculating statistics'
// // //         });
// // //     }
// // // });

// // // // Error handling middleware
// // // app.use((err, req, res, next) => {
// // //     console.error(err.stack);
// // //     res.status(500).json({ 
// // //         error: err.message,
// // //         details: 'Internal server error'
// // //     });
// // // });

// // // // Export for testing
// // // module.exports = app;

// // // // Start server if running directly
// // // if (require.main === module) {
// // //     const PORT = process.env.PORT || 3000;
// // //     app.listen(PORT, () => {
// // //         console.log(`Server running on port ${PORT}`);
// // //     });
// // // }

// // // // const express = require('express');
// // // // const cors = require('cors');
// // // // const helmet = require('helmet');
// // // // const morgan = require('morgan');
// // // // const multer = require('multer');
// // // // const path = require('path');
// // // // const fs = require('fs').promises;

// // // // const app = express();
// // // // const upload = multer({ dest: 'uploads/' });

// // // // // Middleware
// // // // app.use(cors());
// // // // app.use(helmet());
// // // // app.use(morgan('dev'));
// // // // app.use(express.json());

// // // // // Health check endpoint
// // // // app.get('/health', (req, res) => {
// // // //     res.status(200).json({ status: 'ok' });
// // // // });

// // // // // File upload endpoint
// // // // app.post('/upload', upload.single('file'), (req, res) => {
// // // //     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
// // // //     res.json({ ok: true, filename: req.file.filename });
// // // // });

// // // // // Stats endpoint
// // // // app.get('/stats/:filename', async (req, res) => {
// // // //     try {
// // // //         const filePath = path.join(__dirname, '../uploads', req.params.filename);
// // // //         const fileContent = await fs.readFile(filePath, 'utf-8');
        
// // // //         const rows = fileContent.trim().split('\n');
// // // //         const headers = rows[0].split(',');
// // // //         const data = rows.slice(1).map(row => {
// // // //             const values = row.split(',');
// // // //             return headers.reduce((obj, header, i) => {
// // // //                 obj[header] = values[i];
// // // //                 return obj;
// // // //             }, {});
// // // //         });

// // // //         const stats = calculateAdvancedStatistics(data);
// // // //         res.json({ columnStats: stats });
// // // //     } catch (error) {
// // // //         res.status(500).json({ error: error.message });
// // // //     }
// // // // });

// // // // module.exports = app;

// // // // // const express = require('express');
// // // // // const cors = require('cors');
// // // // // const helmet = require('helmet');
// // // // // const morgan = require('morgan');
// // // // // const multer = require('multer');
// // // // // const upload = multer({ dest: 'uploads/' }); // Specify the uploads directory

// // // // // const app = express();

// // // // // // Middleware
// // // // // app.use(cors());
// // // // // app.use(helmet());
// // // // // app.use(morgan('dev'));
// // // // // app.use(express.json());

// // // // // // Health check endpoint
// // // // // app.get('/health', (req, res) => {
// // // // //     res.status(200).json({ status: 'ok' });
// // // // // });

// // // // // app.post('/upload', upload.single('file'), (req, res) => {
// // // // //     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
// // // // //     // you can process req.file.path / req.file.originalname here
// // // // //     res.json({ ok: true, filename: req.file.filename, originalname: req.file.originalname });
// // // // // });

// // // // // // For testing, we need to export the app
// // // // // module.exports = app;

// // // // // // Start server only if running directly
// // // // // if (require.main === module) {
// // // // //     const PORT = process.env.PORT || 3000;
// // // // //     app.listen(PORT, () => {
// // // // //         console.log(`Server running on port ${PORT}`);
// // // // //     });
// // // // // }

// // // // // // filepath: c:\Users\USER\sourcecodes\tests\server\server.js

// // // // // app.post('/upload', upload.single('file'), (req, res) => {
// // // // //     if (!req.file) {
// // // // //         return res.status(400).json({ error: 'No file uploaded' });
// // // // //     }
// // // // //     res.json({ ok: true });
// // // // // });

// // // // // module.exports = app;