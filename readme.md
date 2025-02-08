## Overview

**Project Title**: CSE 310 LiveChat

**Project Description**: This project creates a Node.js webserver (via Express.js) to host a livechat application with data persistence via a PostgreSQL database.

**Project Goals**: The goal for this project is to create a live-chat application that communicates messages, gifs, and polls to everyone connected and to save it to a database that can be queried at a later time to display a history.

## Instructions for Build and Use

Steps to build and/or run the software:

1. `npm i --save`
2. Establish PostgreSQL connection details in a .env file.
3. `node server`

Instructions for using the software:

1. Navigate to `localhost:5500`. 
2. Type in a username and update the profile.
3. Start talking!
 
## Development Environment 

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* Node.js v20+
* Express.js (latest)
* socketio (latest)
* ejs (latest)
* multer (latest)
* pg (latest)
* sharp (latest)

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [Socket.IO](https://socket.io)
* [W3Schools](https://www.w3schools.com/postgresql/)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] Properly display messages such as gifs and polls (with their responses) when loading from history.
* [ ] Integrate user accounts to properly track messages, load correct usernames and pfps, and to increase security.
* [ ] Add channels to switch chatrooms.