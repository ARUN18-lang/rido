describe('upload.middleware', () => {
  const originalBucket = process.env.AWS_S3_BUCKET;

  afterEach(() => {
    jest.resetModules();
    process.env.AWS_S3_BUCKET = originalBucket;
  });

  it('ignores S3-style file metadata while AWS uploads are disabled', () => {
    process.env.AWS_S3_BUCKET = 'rido-docs';

    const { getUploadedFileUrl } = require('../../src/middleware/upload.middleware');
    const req = { protocol: 'http', get: jest.fn().mockReturnValue('localhost:3000') };

    expect(getUploadedFileUrl(req, { key: 'documents/doc.pdf' })).toBeNull();
  });

  it('builds local URLs for disk-backed uploads even when an S3 bucket is configured', () => {
    process.env.AWS_S3_BUCKET = 'rido-docs';

    const { getUploadedFileUrl } = require('../../src/middleware/upload.middleware');
    const req = { protocol: 'http', get: jest.fn().mockReturnValue('192.168.1.10:3000') };

    expect(getUploadedFileUrl(req, {
      destination: '/Users/arunkumar/Desktop/Rido/rido-backend/uploads/documents',
      filename: 'doc.jpg',
    })).toBe('http://192.168.1.10:3000/uploads/documents/doc.jpg');
  });
});
