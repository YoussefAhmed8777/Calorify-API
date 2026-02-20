const mongoose = require('mongoose');

const connectDB = async (req, res)=>{
  try {
    const connection = await mongoose.connect(process.env.MONGO_COMPASS);
    console.log('MongoDB Compass is connected');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;