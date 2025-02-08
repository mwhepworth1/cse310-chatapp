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

io.on('connection', async (socket) => {
    const userIp = socket.handshake.address;
    console.log(`[WS] A user connected from IP: ${userIp}`);

    socket.emit('request profile');

    // Load persistent messages and polls from the DB and send to the new user.
    try {
        const messagesResult = await pool.query(`
            SELECT m.message_id, m.content, m.created_at, u.display_name, u.profile_picture
            FROM messages m
            LEFT JOIN users u ON m.user_id = u.user_id
            WHERE m.channel_id = 1
            ORDER BY m.created_at ASC
        `);
        const messages = messagesResult.rows.map(row => ({
            message_id: row.message_id,
            text: row.content,
            timestamp: new Date(row.created_at).toLocaleTimeString(),
            displayName: row.display_name,
            profilePicture: row.profile_picture
        }));

        // Load polls
        const pollsResult = await pool.query(`
            SELECT poll_id, question, created_at
            FROM polls
            ORDER BY created_at ASC
        `);
        const polls = [];
        for (const poll of pollsResult.rows) {
            const optionsResult = await pool.query(`
                SELECT po.option_text, COUNT(pv.vote_id) AS vote_count
                FROM poll_options po
                LEFT JOIN poll_votes pv ON po.option_id = pv.option_id
                WHERE po.poll_id = $1
                GROUP BY po.option_text
            `, [poll.poll_id]);
            
            const votes = {};
            let totalVotes = 0;
            const options = optionsResult.rows.map(r => {
                const count = parseInt(r.vote_count, 10);
                votes[r.option_text] = count;
                totalVotes += count;
                return r.option_text;
            });
            polls.push({
                pollId: poll.poll_id,
                question: poll.question,
                options,
                votes,
                totalVotes
            });
        }

        socket.emit('load data', { messages, polls });
    } catch (err) {
        console.error('Error loading persistent data:', err);
    }

    socket.on('chat message', (msg) => {
        msg.timestamp = new Date().toLocaleTimeString();
        const forbiddenWords = ['badword1', 'badword2']; // https://www.cs.cmu.edu/~biglou/resources/bad-words.txt
        let isMessageClean = true;
        forbiddenWords.forEach(word => {
            if (msg.text.includes(word)) {
                isMessageClean = false;
            }
        });
        if (isMessageClean) {
            // Insert the message into the DB before broadcasting to ensure the message saves correctly,
            // returning the message id and created_at timestamp.
            const userId = 1;     
            const channelId = 1;  
            const query = 'INSERT INTO messages (user_id, channel_id, content) VALUES ($1, $2, $3) RETURNING message_id, created_at';
            pool.query(query, [userId, channelId, msg.text])
                .then(result => {
                    msg.message_id = result.rows[0].message_id;
                    msg.timestamp = new Date(result.rows[0].created_at).toLocaleTimeString();
                    io.emit('chat message', msg);
                })
                .catch(err => {
                    console.error('Error inserting message:', err);
                    io.emit('chat message', msg);
                });
        } else {
            socket.emit('message error', 'Your message contains inappropriate content.');
        }
    });

    socket.on('edit message', (data) => {
        const query = `
            UPDATE messages 
            SET content = $1 
            WHERE message_id = $2 
              AND (CURRENT_TIMESTAMP - created_at) < interval '5 minutes'
            RETURNING content`;
        pool.query(query, [data.newContent, data.messageId])
            .then(result => {
                if (result.rowCount > 0) {
                    io.emit('message edited', { messageId: data.messageId, newContent: result.rows[0].content });
                } else {
                    socket.emit('message error', 'Edit failed: time expired or unauthorized.');
                }
            })
            .catch(err => {
                console.error('Error editing message:', err);
                socket.emit('message error', 'Edit error');
            });
    });

    socket.on('delete message', (data) => {
        const query = "DELETE FROM messages WHERE message_id = $1 RETURNING message_id";
        pool.query(query, [data.messageId])
            .then(result => {
                if (result.rowCount > 0) {
                    io.emit('message deleted', { messageId: data.messageId });
                } else {
                    socket.emit('message error', 'Delete failed: message not found or unauthorized.');
                }
            })
            .catch(err => {
                console.error('Error deleting message:', err);
                socket.emit('message error', 'Delete error');
            });
    });

    socket.on('create poll', async (pollData) => {
        try {
            const createdBy = 1; // default user id
            const pollQuery = 'INSERT INTO polls (question, created_by) VALUES ($1, $2) RETURNING poll_id';
            const pollResult = await pool.query(pollQuery, [pollData.question, createdBy]);
            const pollId = pollResult.rows[0].poll_id;
            for (const option of pollData.options) {
                const optionQuery = 'INSERT INTO poll_options (poll_id, option_text) VALUES ($1, $2)';
                await pool.query(optionQuery, [pollId, option]);
            }
            const votes = {};
            pollData.options.forEach(option => votes[option] = 0);
            io.emit('poll update', { pollId, question: pollData.question, options: pollData.options, votes, totalVotes: 0 });
        } catch (err) {
            console.error('Error creating poll:', err);
            socket.emit('message error', 'Poll creation failed.');
        }
    });

    socket.on('vote submission', async (voteData) => {
        try {
            const { pollId, selectedOption } = voteData;
            const optionQuery = 'SELECT option_id FROM poll_options WHERE poll_id = $1 AND option_text = $2';
            const optionResult = await pool.query(optionQuery, [pollId, selectedOption]);
            if(optionResult.rowCount === 0) {
                return socket.emit('message error', 'Invalid poll option.');
            }
            const optionId = optionResult.rows[0].option_id;
            const userId = 1; // default user id

            const voteQuery = 'INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)';
            await pool.query(voteQuery, [pollId, optionId, userId]);

            const votesQuery = `
                SELECT po.option_text, COUNT(pv.vote_id) AS vote_count
                FROM poll_options po
                LEFT JOIN poll_votes pv ON po.option_id = pv.option_id
                WHERE po.poll_id = $1
                GROUP BY po.option_text
            `;
            const votesResult = await pool.query(votesQuery, [pollId]);
            const votes = {};
            let totalVotes = 0;
            votesResult.rows.forEach(row => {
                const count = parseInt(row.vote_count, 10);
                votes[row.option_text] = count;
                totalVotes += count;
            });
            io.emit('vote update', { pollId, options: Object.keys(votes), votes, totalVotes });
        } catch (err) {
            console.error('Error submitting vote:', err);
            socket.emit('message error', 'Vote submission failed.');
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