require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory user storage
const users = {};

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
            // Check if the user exists; if not, create a new entry
            if (!users[profile.id]) {
                users[profile.id] = {
                    id: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    profilePicture: profile.photos[0].value,
                    about: '',
                    projects: [],
                    contact: {},
                };
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
    done(null, users[id]);
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
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

app.post('/edit', ensureAuthenticated, (req, res) => {
    const { about, projects, contactEmail, contactGithub, contactLinkedin } = req.body;

    // Update user profile
    const user = users[req.user.id];
    user.about = about;

    // Parse and update projects
    user.projects = [];
    if (typeof projects === 'string') {
        try {
            const parsedProjects = JSON.parse(projects);
            user.projects = parsedProjects;
        } catch (error) {
            console.error('Error parsing projects:', error);
        }
    }

    // Update contact information
    user.contact = {
        email: contactEmail,
        github: contactGithub,
        linkedin: contactLinkedin,
    };

    res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
