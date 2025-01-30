const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 5500;

// Ensure the directory exists
const uploadDir = path.join(__dirname, 'public', 'pfps');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory
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

// Define a route
app.get('/', (req, res) => {
    const userProfilePicture = 'https://placehold.co/512x512'; // Example profile picture URL
    const userDisplayName = 'Matthew H'; // Example display name

    res.render('index', { 
        title: 'Chat App',
        userProfilePicture,
        userDisplayName
    });
});

// Handle profile updates
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

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle incoming messages
    socket.on('chat message', (msg) => {
        console.log(`${msg.displayName} > ${msg.text}`); // Log message by display name
        io.emit('chat message', msg); // Broadcast message to all clients
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});