const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/connectDB');
const app = express();
const mealRoutes = require('./src/routes/meal.routes');
const userRoutes = require('./src/routes/user.routes');
const foodRoutes = require('./src/routes/food.routes');
const chatRoutes = require('./src/routes/chat.routes');


console.log(`Hello From Server Port: ${process.env.SERVER_PORT}`);

connectDB();

//Middleware
app.use(express.json());

app.use('/calorify', mealRoutes);
app.use('/calorify/foods', foodRoutes);
app.use('/calorify/auth', userRoutes);
app.use('/calorify/users', userRoutes);
app.use('/calorify/chat', chatRoutes);

app.listen(process.env.PORT, ()=>{
  console.log(`Hello From Local Port: ${process.env.PORT}`);
});