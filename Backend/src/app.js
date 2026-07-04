const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const errorMiddleware = require('./shared/middlewares/error.middleware');

// Route Imports
const authRoutes = require('./modules/auth/auth.routes');
const aiRoutes = require('./modules/ai/ai.routes');
// const userRoutes = require('./modules/user/user.routes');
const emailRoutes = require('./modules/email/email.routes');
// const categoryRoutes = require('./modules/category/category.routes');
// const contactsRoutes = require('./modules/contacts/contacts.routes');
// const replyRoutes = require('./modules/reply/reply.routes');
// const spamRoutes = require('./modules/spam/spam.routes');
// const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
// const notificationRoutes = require('./modules/notification/notification.routes');
// const searchRoutes = require('./modules/search/search.routes');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(cors({
  origin: [
    env.FRONTEND_URL, 
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Initialize Passport (Stateless for JWT)
const passport = require('./config/passport');
app.use(passport.initialize());

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/emails', emailRoutes);
// app.use('/api/categories', categoryRoutes);
// app.use('/api/contacts', contactsRoutes);
app.use('/api/ai', aiRoutes);
// app.use('/api/replies', replyRoutes);
// app.use('/api/spam', spamRoutes);
// app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/search', searchRoutes);

// Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
