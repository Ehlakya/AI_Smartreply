const mongoose = require('mongoose');

const uri = 'mongodb+srv://ehlakyas_db_user:MyPassword123@cluster0.3ydhcgl.mongodb.net/?appName=Cluster0';

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
