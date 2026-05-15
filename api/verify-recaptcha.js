const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recaptcha_token } = req.body;

  if (!recaptcha_token) {
    return res.status(400).json({ success: false, error: 'reCAPTCHA token missing.' });
  }

  return new Promise((resolve) => {
    const secret = '6LcugOssAAAAAIvIrS3f32de1c0--VL4ZgeddKZr';
    const postData = 'secret=' + encodeURIComponent(secret) + '&response=' + encodeURIComponent(recaptcha_token);
    const options = {
      hostname: 'www.google.com',
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            res.status(200).json({ success: true });
          } else {
            res.status(400).json({ success: false, error: 'reCAPTCHA verification failed.' });
          }
        } catch {
          res.status(500).json({ success: false, error: 'Invalid response from reCAPTCHA.' });
        }
        resolve();
      });
    });

    request.on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
      resolve();
    });

    request.write(postData);
    request.end();
  });
};
