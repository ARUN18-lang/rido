const { S3Client } = require('@aws-sdk/client-s3');
const config = require('./index');

let s3Client = null;

function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined,
    });
  }
  return s3Client;
}

module.exports = { getS3 };
