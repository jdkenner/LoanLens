const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { type: 'config_error', message: 'API key not configured.' } });
  }

  try {
    const body = req.body;
    body.max_tokens = body.max_tokens || 2000;

    const bodyStr = JSON.stringify(body);

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            res.status(response.statusCode).json(parsed);
          } catch(e) {
            res.status(500).json({ error: { type: 'parse_error', message: e.message } });
          }
          resolve();
        });
      });

      request.on('error', (err) => {
        res.status(500).json({ error: { type: 'network_error', message: err.message } });
        resolve();
      });

      request.write(bodyStr);
      request.end();
    });

  } catch (err) {
    return res.status(500).json({ error: { type: 'proxy_error', message: err.message } });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};
