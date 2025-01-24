require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');
const connectDB = require('./config/db');
const Blog = require('./models/blogs');

const app = express();

// Connect to database
connectDB();

// MongoDB session store
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions',
});

app.use(async (req, res, next) => {
  try {
    const categories = Blog.schema.path('category').enumValues || [];
    res.locals.categories = categories; // This makes `categories` available in all views
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.locals.categories = [];
  }
  next();
});

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}));

// Add CSRF protection middleware
app.use(csrf());

// Global middleware for CSRF token and user session
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken(); // CSRF token available in views
    res.locals.isAuthenticated = req.session.isAuthenticated || false;
    res.locals.user = req.session.user || null;
    next();
  } catch (error) {
    console.error('Error in CSRF middleware:', error);
    next(error);
  }
});

// Routes
app.use(authRoutes);
app.use(blogRoutes);

// Error handler
app.use((error, req, res, next) => {
  res.status(500).render('error', {
    error: error.message || 'Something went wrong!',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
