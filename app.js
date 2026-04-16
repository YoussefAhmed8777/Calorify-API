// Imports
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/connectDB');
const app = express();
const mealRoutes = require('./src/routes/meal.routes');
const userRoutes = require('./src/routes/user.routes');
const foodRoutes = require('./src/routes/food.routes');
const chatRoutes = require('./src/routes/chat.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const progressRoutes = require('./src/routes/progress.routes');
const scanRoutes = require('./src/routes/scan.routes');
const {
  generalLimiter,
  authLimiter,
  scanLimiter,
  premiumScanLimiter,
  chatLimiter
} = require('./src/middlewares/rateLimiter.middleware');
const cors = require('cors');
const { corsOptions } = require('./src/config/cors');
const { helmetConfig, devHelmet } = require('./src/config/helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { xssProtection } = require('./src/middlewares/xss.middleware');
const compression = require('compression');

// 1. Helmet - Security headers
if (process.env.NODE_ENV === 'production') {
  app.use(helmetConfig);
} else {
  app.use(devHelmet);
};

// Apply CORS before routes
app.use(cors(corsOptions));

console.log(`Hello From Server Port: ${process.env.SERVER_PORT}`);

// Databse Connection
connectDB();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Data sanitization
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
});
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xssProtection()); // Prevent XSS attacks
app.use(compression());

// Apply general limiter to ALL API routes
app.use('/calorify', generalLimiter);

// Apply stricter limiter to auth routes
app.use('/calorify/auth', authLimiter);

// Apply scan limiter to scan endpoints
app.use('/calorify/scan', scanLimiter);

// Apply chat limiter to chat endpoints
app.use('/calorify/chat', chatLimiter);


// Routes
app.use('/calorify/meals', mealRoutes);
app.use('/calorify/foods', foodRoutes);
app.use('/calorify/auth', userRoutes);
app.use('/calorify/users', userRoutes);
app.use('/calorify/chat', chatRoutes);
app.use('/calorify/notification', notificationRoutes);
app.use('/calorify/progress', progressRoutes);
app.use('/calorify/scan', scanRoutes);
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Using Port
app.listen(process.env.PORT, ()=>{
  console.log(`Hello From Local Port: ${process.env.PORT}`);
});