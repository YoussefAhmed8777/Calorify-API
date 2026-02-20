const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/connectDB');
const app = express();

console.log("Hello From Port: "+8080);

connectDB();

app.get('/', (req, res)=>{
  res.send('Hello From Express Application, Thanks For Your EFFORTS');
});

app.listen(process.env.PORT, ()=>{
  console.log("Hello From Port: "+process.env.PORT);
});