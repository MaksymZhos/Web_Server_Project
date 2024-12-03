require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs'); // For reading/writing JSON files

const app = express();
const PORT = process.env.PORT || 3000;

// File path for storing users
const usersFilePath = path.join(__dirname, 'users.json');

// Middleware setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
console.log(path.join(__dirname, 'public'));  // Log the path to the public directory

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
        },
        (accessToken, refreshToken, profile, done) => {
            // Read the users data from the file
            const users = readUsersFromFile();

            if (!users[profile.id]) {
                // Add a new user
                users[profile.id] = {
                    id: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    profilePicture: profile.photos[0].value,
                    about: '',
                    projects: [],
                    contact: {},
                };
                // Save the updated users back to the file
                saveUsersToFile(users);
            }
            return done(null, users[profile.id]);
        }
    )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const users = readUsersFromFile();
    done(null, users[id]);
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Read users from the JSON file
function readUsersFromFile() {
    try {
        const data = fs.readFileSync(usersFilePath, 'utf8');
        return JSON.parse(data); // Parse the JSON string into an object
    } catch (error) {
        console.error('Error reading users file:', error);
        return {}; // Return an empty object if the file doesn't exist or is empty
    }
}

// Save users to the JSON file
function saveUsersToFile(users) {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing to users file:', error);
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('index', {
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
    });
});

app.get('/login', (req, res) => {
    res.render('login', { isAuthenticated: req.isAuthenticated() });
});

// Google OAuth routes
app.get(
    '/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
    })
);

app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
        (req, res) => {
            res.redirect('/');
        }
);

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

// Profile edit routes
app.get('/edit', ensureAuthenticated, (req, res) => {
    res.render('edit', {
        user: req.user,
        isAuthenticated: true,
    });
});

// Profile save
app.post('/edit', ensureAuthenticated, (req, res) => {
    console.log('Received form data:', req.body);

    const { about, projects, contactEmail, contactGithub, contactLinkedin } = req.body;

    // Log the received projects to verify the structure
    console.log('Projects received:', projects);

    const users = readUsersFromFile();
    const user = users[req.user.id];

    // Update user profile
    user.about = about;

    // Ensure the 'projects' field exists and is an array
    if (projects && Array.isArray(projects)) {
        user.projects = projects;
    } else {
        user.projects = [];
    }

    // Update contact information
    user.contact = {
        email: contactEmail,
        github: contactGithub,
        linkedin: contactLinkedin,
    };

    // Save updated users to the JSON file
    saveUsersToFile(users);

    res.redirect('/');  // Redirect after saving
});

// View User Profile
app.get('/:username', (req, res) => {
    const username = req.params.username;
    const users = readUsersFromFile();

    const user = Object.values(users).find(user => user.name.toLowerCase() === username.toLowerCase());

    if (!user) {
        return res.status(404).send('User not found');
    }

    res.render('portfolio', {
        user: user,
        isAuthenticated: req.isAuthenticated(),
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
