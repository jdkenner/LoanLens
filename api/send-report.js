const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured.' });
  }

  const {
    from_name, from_email, from_phone,
    prop_use, prop_type, credit_score, prop_zip,
    notes, html_report, pdf_base64, date_str
  } = req.body;

  const subject = 'LoanLens Estimate Request from ' + (from_name || 'Unknown');

  const plainText = [
    'New LoanLens estimate request', '',
    'CONTACT',
    'Name:  ' + (from_name || ''),
    'Email: ' + (from_email || ''),
    'Phone: ' + (from_phone || ''), '',
    'LOAN SCENARIO',
    'Property Use:  ' + (prop_use || ''),
    'Property Type: ' + (prop_type || ''),
    'Credit Score:  ' + (credit_score || ''),
    'Property Zip:  ' + (prop_zip || 'Not available'),
    notes ? ('\nNOTES\n' + notes) : '', '',
    'Full comparison report attached as PDF.',
    'LoanLens -- myloanlens.ai'
  ].join('\n');

  const resendPayload = {
    from: 'LoanLens <noreply@myloanlens.ai>',
    to: ['jkenner@meploans.com'],
    reply_to: from_email,
    subject,
    text: plainText,
    html: html_report || ('<pre>' + plainText + '</pre>'),
    attachments: (pdf_base64 && date_str) ? [{
      filename: 'LoanLens-Comparison-' + date_str + '.pdf',
      content: pdf_base64
    }] : []
  };

  return new Promise((resolve) => {
    const body = JSON.stringify(resendPayload);
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          res.status(200).json({ success: true });
        } else {
          res.status(response.statusCode).json({ error: data });
        }
        resolve();
      });
    });

    request.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });

    request.write(body);
    request.end();
  });
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};
