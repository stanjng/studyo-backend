require('dotenv').config()
// Require mime-types package
const mime = require('mime-types')
// Require AWS SDK
const AWS = require('aws-sdk')
// Set AWS region
AWS.config.update({
  region: 'us-east-2',
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY})
// Create S3 Object instance
const s3 = new AWS.S3()
// Define bucket based on environment variable
const bucketName = process.env.BUCKET_NAME

module.exports = function (file) {
  return new Promise((resolve, reject) => {
    // Create params object for s3 upload
    const params = {
      Bucket: bucketName,
      Key: `${Date.now()}_${file.originalname}`,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype
    }

    // Upload to s3
    s3.upload(params, (err, s3Data) => {
      if (err) reject(err)

      resolve(s3Data)
    })
  })
}
