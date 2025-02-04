const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const pg = require('pg');
const { Pool, Client } = pg;
const dotenv = require('dotenv');
dotenv.config();

/**
 * A Client represents a single connection to the database, which you manually connect and disconnect, while a Pool 
 * manages multiple client connections and reuses them automatically for concurrent queries. 
 * The Pool simplifies connection management and is recommended for web applications with many requests. 
 * Source: GitHub Copilot using o3-mini (preview).
 */
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});

const testDbConnection = async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('[DB] Connected to the database');
        return true;
    } catch (err) {
        console.error('Database connection error:', err);
        return false;
    }
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 5500;

const uploadDir = path.join(__dirname, 'public', 'pfps');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
    const defaultProfilePictureUrl = process.env.DEFAULT_PROFILE_PICTURE_URL || 'http://localhost:5500/pfps/dummy';
    const userProfilePicture = `${defaultProfilePictureUrl}/${Math.floor(Math.random() * 18) + 1}.jpg`; // Default profile picture URL
    const userDisplayName = '';

    res.render('index', { 
        title: 'Chat App',
        userProfilePicture,
        userDisplayName
    });
});

app.post('/update-profile', upload.single('profile-picture-file'), async (req, res) => {
    let userProfilePicture = req.body['profile-picture-url'];

    // If a new profile picture file is uploaded, update the profile picture URL
    if (req.file) {
        userProfilePicture = `/pfps/${req.file.filename}`;
    }

    const userDisplayName = req.body.displayname;

    res.json({
        message: "Profile updated successfully",
        profilePicture: userProfilePicture,
        displayName: userDisplayName
    });
});

const polls = {}; // Global polls storage

io.on('connection', (socket) => {
    const userIp = socket.handshake.address;
    console.log(`[WS] A user connected from IP: ${userIp}`);

    socket.emit('request profile');

    socket.on('chat message', (msg) => {
        // Attach a timestamp to the message
        msg.timestamp = new Date().toLocaleTimeString();
        // Simple content moderation
        const forbiddenWords = ['badword1', 'badword2']; // https://www.cs.cmu.edu/~biglou/resources/bad-words.txt
        let isMessageClean = true;

        forbiddenWords.forEach(word => {
            if (msg.text.includes(word)) {
                isMessageClean = false;
            }
        });

        if (isMessageClean) {
            // Insert the message into the DB before broadcasting
            const userId = 1;     // Assumed default user_id
            const channelId = 1;  // Assumed default channel_id for "General"
            const query = 'INSERT INTO messages (user_id, channel_id, content) VALUES ($1, $2, $3) RETURNING created_at';
            pool.query(query, [userId, channelId, msg.text])
                .then(result => {
                    msg.timestamp = new Date(result.rows[0].created_at).toLocaleTimeString();
                    io.emit('chat message', msg);
                })
                .catch(err => {
                    console.error('Error inserting message:', err);
                    // Optionally still broadcast the message if insert fails.
                    io.emit('chat message', msg);
                });
        } else {
            socket.emit('message error', 'Your message contains inappropriate content.');
        }
    });

    // Handle poll creation and store poll data
    socket.on('create poll', (pollData) => {
        // Initialize votes count for each option to 0
        const votes = {};
        pollData.options.forEach(option => votes[option] = 0);
        polls[pollData.question] = { options: pollData.options, votes };
        io.emit('poll update', { question: pollData.question, options: pollData.options, votes, totalVotes: 0 });
    });

    // Handle vote submission
    socket.on('vote submission', (voteData) => {
        const poll = polls[voteData.question];
        if (poll) {
            poll.votes[voteData.selectedOption] = (poll.votes[voteData.selectedOption] || 0) + 1;
            const totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0);
            // Broadcast vote update event to all connected clients
            io.emit('vote update', { question: voteData.question, options: poll.options, votes: poll.votes, totalVotes });
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

(async () => {
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
        console.error('Failed to connect to the database. Exiting...');
        process.exit(1);
    }

    server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
})();