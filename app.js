const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/connectDB');
const app = express();
const mealRoutes = require('./src/routes/meal.routes');


console.log(`Hello From Port: ${process.env.SERVER_PORT}`);

connectDB();

//Middleware
app.use(express.json());

// Routing examples
// Get all /calorify/meals
// Get one /calorify/meal/:id
// Post /calorify/meal
// Put /calorify/meal/:id
// Remove /calorify/meal/:id

app.use('/calorify', mealRoutes);

app.listen(process.env.PORT, ()=>{
  console.log(`Hello From Port: ${process.env.PORT}`);
});