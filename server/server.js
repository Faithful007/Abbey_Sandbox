const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { calculateAdvancedStatistics } = require('./stats');

// Initialize Express app
const app = express();

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
        ok: true, 
        filename: req.file.filename,
        originalname: req.file.originalname 
    });
});

// Stats calculation endpoint
app.get('/stats/:filename', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../uploads', req.params.filename);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        // Parse CSV content
        const rows = fileContent.trim().split('\n');
        const headers = rows[0].split(',');
        const data = rows.slice(1).map(row => {
            const values = row.split(',');
            return headers.reduce((obj, header, i) => {
                obj[header.trim()] = values[i]?.trim();
                return obj;
            }, {});
        });

        const stats = calculateAdvancedStatistics(data);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error processing file or calculating statistics'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: err.message,
        details: 'Internal server error'
    });
});

// Export for testing
module.exports = app;

// Start server if running directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs').promises;
// const { calculateAdvancedStatistics } = require('./stats');

// // Initialize Express app
// const app = express();

// // Configure multer for file uploads
// const upload = multer({ 
//     dest: 'uploads/',
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype === 'text/csv') {
//             cb(null, true);
//         } else {
//             cb(new Error('Only CSV files are allowed'));
//         }
//     }
// });

// // Middleware
// app.use(cors());
// app.use(helmet());
// app.use(morgan('dev'));
// app.use(express.json());

// // Health check endpoint
// app.get('/health', (req, res) => {
//     res.status(200).json({ status: 'ok' });
// });

// // File upload endpoint
// app.post('/upload', upload.single('file'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//     }
//     res.json({ 
//         ok: true, 
//         filename: req.file.filename,
//         originalname: req.file.originalname 
//     });
// });

// // Stats calculation endpoint
// app.get('/stats/:filename', async (req, res) => {
//     try {
//         const filePath = path.join(__dirname, '../uploads', req.params.filename);
//         const fileContent = await fs.readFile(filePath, 'utf-8');
        
//         // Parse CSV content
//         const rows = fileContent.trim().split('\n');
//         const headers = rows[0].split(',');
//         const data = rows.slice(1).map(row => {
//             const values = row.split(',');
//             return headers.reduce((obj, header, i) => {
//                 obj[header] = values[i];
//                 return obj;
//             }, {});
//         });

//         const stats = calculateAdvancedStatistics(data);
//         res.json(stats);
//     } catch (error) {
//         res.status(500).json({ 
//             error: error.message,
//             details: 'Error processing file or calculating statistics'
//         });
//     }
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ 
//         error: err.message,
//         details: 'Internal server error'
//     });
// });

// // Export for testing
// module.exports = app;

// // Start server if running directly
// if (require.main === module) {
//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//         console.log(`Server running on port ${PORT}`);
//     });
// }

// // const express = require('express');
// // const cors = require('cors');
// // const helmet = require('helmet');
// // const morgan = require('morgan');
// // const multer = require('multer');
// // const path = require('path');
// // const fs = require('fs').promises;

// // const app = express();
// // const upload = multer({ dest: 'uploads/' });

// // // Middleware
// // app.use(cors());
// // app.use(helmet());
// // app.use(morgan('dev'));
// // app.use(express.json());

// // // Health check endpoint
// // app.get('/health', (req, res) => {
// //     res.status(200).json({ status: 'ok' });
// // });

// // // File upload endpoint
// // app.post('/upload', upload.single('file'), (req, res) => {
// //     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
// //     res.json({ ok: true, filename: req.file.filename });
// // });

// // // Stats endpoint
// // app.get('/stats/:filename', async (req, res) => {
// //     try {
// //         const filePath = path.join(__dirname, '../uploads', req.params.filename);
// //         const fileContent = await fs.readFile(filePath, 'utf-8');
        
// //         const rows = fileContent.trim().split('\n');
// //         const headers = rows[0].split(',');
// //         const data = rows.slice(1).map(row => {
// //             const values = row.split(',');
// //             return headers.reduce((obj, header, i) => {
// //                 obj[header] = values[i];
// //                 return obj;
// //             }, {});
// //         });

// //         const stats = calculateAdvancedStatistics(data);
// //         res.json({ columnStats: stats });
// //     } catch (error) {
// //         res.status(500).json({ error: error.message });
// //     }
// // });

// // module.exports = app;

// // // const express = require('express');
// // // const cors = require('cors');
// // // const helmet = require('helmet');
// // // const morgan = require('morgan');
// // // const multer = require('multer');
// // // const upload = multer({ dest: 'uploads/' }); // Specify the uploads directory

// // // const app = express();

// // // // Middleware
// // // app.use(cors());
// // // app.use(helmet());
// // // app.use(morgan('dev'));
// // // app.use(express.json());

// // // // Health check endpoint
// // // app.get('/health', (req, res) => {
// // //     res.status(200).json({ status: 'ok' });
// // // });

// // // app.post('/upload', upload.single('file'), (req, res) => {
// // //     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
// // //     // you can process req.file.path / req.file.originalname here
// // //     res.json({ ok: true, filename: req.file.filename, originalname: req.file.originalname });
// // // });

// // // // For testing, we need to export the app
// // // module.exports = app;

// // // // Start server only if running directly
// // // if (require.main === module) {
// // //     const PORT = process.env.PORT || 3000;
// // //     app.listen(PORT, () => {
// // //         console.log(`Server running on port ${PORT}`);
// // //     });
// // // }

// // // // filepath: c:\Users\USER\sourcecodes\tests\server\server.js

// // // app.post('/upload', upload.single('file'), (req, res) => {
// // //     if (!req.file) {
// // //         return res.status(400).json({ error: 'No file uploaded' });
// // //     }
// // //     res.json({ ok: true });
// // // });

// // // module.exports = app;