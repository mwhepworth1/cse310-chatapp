const express = require('express');
const path = require('path');

const app = express();
const port = 5500;

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});