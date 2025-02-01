CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    display_name VARCHAR NOT NULL,
    profile_picture VARCHAR,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE channels (
    channel_id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    channel_id INTEGER REFERENCES channels(channel_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE polls (
    poll_id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE poll_options (
    option_id SERIAL PRIMARY KEY,
    poll_id INTEGER REFERENCES polls(poll_id),
    option_text TEXT NOT NULL
);

CREATE TABLE poll_votes (
    vote_id SERIAL PRIMARY KEY,
    poll_id INTEGER REFERENCES polls(poll_id),
    option_id INTEGER REFERENCES poll_options(option_id),
    user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);