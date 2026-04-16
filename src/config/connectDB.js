const mongoose = require('mongoose');

const connectDB = async (req, res)=>{
  try {
    // const connection = await mongoose.connect(process.env.MONGO_COMPASS);
    const connection = await mongoose.connect(process.env.MONGO_ATLAS);
    console.log('MongoDB Atlas is connected');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;