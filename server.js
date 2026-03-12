const express    = require('express');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ── File uploads ──────────────────────────────────────────────
const upload = multer({ dest: 'uploads/' });

// ── Zoho SMTP transporter ─────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@supracontrols.com',
    pass: 'UAem 6Qe1 40S4',            // Zoho App Password
  },
});

const FROM    = '"Supra Controls No-Reply" <support@supracontrols.com>';
const TO_TEAM = 'support@supracontrols.com'; // internal team inbox

function htmlWrap(title, bodyRows) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0;}
    .container{max-width:600px;margin:30px auto;background:#fff;
               border-radius:8px;overflow:hidden;
               box-shadow:0 2px 8px rgba(0,0,0,0.08);}
    .header{background:#0d2a3d;padding:24px 32px;}
    .header h1{color:#ff6600;margin:0;font-size:20px;}
    .header p{color:#ccc;margin:4px 0 0;font-size:13px;}
    .body{padding:24px 32px;}
    table{width:100%;border-collapse:collapse;}
    td{padding:8px 0;vertical-align:top;font-size:14px;
       color:#333;border-bottom:1px solid #f0f0f0;}
    td.label{width:160px;font-weight:bold;color:#555;}
    .section-title{font-size:13px;font-weight:bold;color:#0d2a3d;
                   text-transform:uppercase;letter-spacing:1px;
                   margin:18px 0 6px;border-bottom:2px solid #ff6600;
                   padding-bottom:4px;}
    .footer{background:#f4f6f8;padding:14px 32px;font-size:11px;
            color:#999;text-align:center;}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p>Supra Controls Pvt Ltd — Automated Notification</p>
    </div>
    <div class="body">${bodyRows}</div>
    <div class="footer">
      This is an automated email. Reply directly to respond to the sender.
    </div>
  </div>
</body>
</html>`;
}

function ackHtml(name, mainContent) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0;}
    .container{max-width:600px;margin:30px auto;background:#fff;
               border-radius:8px;overflow:hidden;
               box-shadow:0 2px 8px rgba(0,0,0,0.08);}
    .header{background:#0d2a3d;padding:28px 32px;text-align:center;}
    .header img{height:40px;margin-bottom:10px;}
    .header h1{color:#ff6600;margin:0;font-size:22px;}
    .body{padding:32px;}
    .body p{font-size:15px;color:#333;line-height:1.7;margin:0 0 14px;}
    .token-box{background:#f0f6ff;border:1px solid #c5d9f2;
               border-radius:6px;padding:14px 20px;margin:18px 0;
               font-size:18px;font-weight:bold;color:#0d2a3d;
               text-align:center;letter-spacing:1px;}
    .divider{border:none;border-top:1px solid #eee;margin:22px 0;}
    .footer{background:#f4f6f8;padding:16px 32px;font-size:12px;
            color:#999;text-align:center;}
    .footer a{color:#ff6600;text-decoration:none;}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Supra Controls</h1>
    </div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      ${mainContent}
      <hr class="divider"/>
      <p style="font-size:13px;color:#777;">
        If you have any urgent queries, you can also reach us at
        <a href="mailto:support@supracontrols.com" style="color:#ff6600;">
          support@supracontrols.com
        </a>
        or call <strong>+91 9940465855</strong>.
      </p>
      <p style="font-size:14px;color:#555;">
        Warm regards,<br/>
        <strong>Supra Controls Support Team</strong><br/>
        <span style="font-size:12px;color:#999;">Chennai, Tamil Nadu, India</span>
      </p>
    </div>
    <div class="footer">
      © Supra Controls Pvt Ltd. All rights reserved.<br/>
      <a href="https://www.supracontrols.com">www.supracontrols.com</a>
    </div>
  </div>
</body>
</html>`;
}

function row(label, value) {
  return `<tr><td class="label">${label}</td><td>${value || '—'}</td></tr>`;
}

// ══════════════════════════════════════════════════════════════
// 1. SUPPORT REQUEST
//
//  → Email 1 (to team):
//      From:     support@supracontrols.com  (Supra Controls No-Reply)
//      To:       support@supracontrols.com
//      Reply-To: user's email  ← team clicks Reply → goes to user
//      Subject:  [Support #<tokenId>] <product>
//
//  → Email 2 (acknowledgement to user):
//      From:     support@supracontrols.com
//      To:       user's email
//      Subject:  Your Support Request Has Been Received – Supra Controls
// ══════════════════════════════════════════════════════════════
app.post('/support-email', upload.array('attachments'), async (req, res) => {
  const {
    tokenId, name, companyname, location,
    email, mobile, product, description
  } = req.body;

  const attachments = req.files.map(f => ({ filename: f.originalname, path: f.path }));

  const teamBody = `
    <table>
      <tr>
        <td class="label">Token ID</td>
        <td><strong style="font-size:16px;color:#0d2a3d;">${tokenId}</strong></td>
      </tr>
    </table>
    <div class="section-title">Contact Details</div>
    <table>
      ${row('Name',    name)}
      ${row('Company', companyname)}
      ${row('Location',location)}
      ${row('Email',   `<a href="mailto:${email}">${email}</a>`)}
      ${row('Mobile',  mobile)}
    </table>
    <div class="section-title">Issue Details</div>
    <table>
      ${row('Product', product)}
    </table>
    <div class="section-title">Description</div>
    <p style="font-size:14px;color:#333;line-height:1.6;">${description}</p>`;

  const teamMail = {
    from:    FROM,
    to:      TO_TEAM,
    replyTo: `"${name}" <${email}>`,
    subject: `[Support #${tokenId}] ${product}`,
    html:    htmlWrap('New Support Request', teamBody),
    attachments,
  };

  const userContent = `
    <p>Thank you for reaching out to us. We have received your support request
       and our team will get back to you within <strong>24–48 hours</strong>.</p>
    <p>Your support token ID is:</p>
    <div class="token-box">${tokenId}</div>
    <p>Please save this Token ID for future reference when following up
       with our support team.</p>
    <p><strong>Summary of your request:</strong></p>
    <p style="font-size:14px;color:#555;">
      <strong>Product:</strong> ${product}<br/>
      <strong>Description:</strong> ${description}
    </p>`;

  const userMail = {
    from:    FROM,
    to:      email,
    subject: `Your Support Request Has Been Received – Supra Controls [#${tokenId}]`,
    html:    ackHtml(name, userContent),
  };

  try {
    await Promise.all([
      transporter.sendMail(teamMail),
      transporter.sendMail(userMail),
    ]);
    res.status(200).send('Email sent successfully');
  } catch (err) {
    console.error('Support email error:', err);
    res.status(500).send('Failed to send email');
  }
});

// ══════════════════════════════════════════════════════════════
// 2. CONTACT US
//
//  → Email 1 (to team):
//      From:     support@supracontrols.com  (Supra Controls No-Reply)
//      To:       support@supracontrols.com
//      Reply-To: user's email
//      Subject:  [Contact Us] <subject> – from <name>
//
//  → Email 2 (acknowledgement to user):
//      From:     support@supracontrols.com
//      To:       user's email
//      Subject:  We've Received Your Message – Supra Controls
// ══════════════════════════════════════════════════════════════
app.post('/contact-email', upload.array('attachments'), async (req, res) => {
  const { email, name, mobile, message, subject } = req.body;

  const attachments = req.files.map(f => ({ filename: f.originalname, path: f.path }));

  const teamBody = `
    <div class="section-title">Contact Details</div>
    <table>
      ${row('Name',    name)}
      ${row('Email',   `<a href="mailto:${email}">${email}</a>`)}
      ${row('Mobile',  mobile)}
      ${row('Subject', subject || 'General Enquiry')}
    </table>
    <div class="section-title">Message</div>
    <p style="font-size:14px;color:#333;line-height:1.6;">${message}</p>`;

  const teamMail = {
    from:    FROM,
    to:      TO_TEAM,
    replyTo: `"${name}" <${email}>`,
    subject: `[Contact Us] ${subject || 'General Enquiry'} – from ${name}`,
    html:    htmlWrap('New Contact Form Submission', teamBody),
    attachments,
  };

  const userContent = `
    <p>Thank you for contacting Supra Controls. We have received your message
       and our team will get back to you within <strong>24–48 hours</strong>.</p>
    <p><strong>Your message summary:</strong></p>
    <p style="font-size:14px;color:#555;">
      <strong>Subject:</strong> ${subject || 'General Enquiry'}<br/>
      <strong>Message:</strong> ${message}
    </p>`;

  const userMail = {
    from:    FROM,
    to:      email,
    subject: `We've Received Your Message – Supra Controls`,
    html:    ackHtml(name, userContent),
  };

  try {
    await Promise.all([
      transporter.sendMail(teamMail),
      transporter.sendMail(userMail),
    ]);
    res.status(200).send('Email sent successfully');
  } catch (err) {
    console.error('Contact email error:', err);
    res.status(500).send('Failed to send email');
  }
});

// ══════════════════════════════════════════════════════════════
// 3. CAREERS APPLICATION
//
//  → Email 1 (to team):
//      From:     support@supracontrols.com  (Supra Controls No-Reply)
//      To:       support@supracontrols.com
//      Reply-To: applicant's email
//      Subject:  [Career Application] <name>
//
//  → Email 2 (acknowledgement to applicant):
//      From:     support@supracontrols.com
//      To:       applicant's email
//      Subject:  Thank You for Your Application – Supra Controls
// ══════════════════════════════════════════════════════════════
app.post('/careers-email', upload.array('attachments'), async (req, res) => {
  const { email, name, mobile, message } = req.body;

  const attachments = req.files.map(f => ({ filename: f.originalname, path: f.path }));

  const teamBody = `
    <div class="section-title">Applicant Details</div>
    <table>
      ${row('Name',            name)}
      ${row('Email',           `<a href="mailto:${email}">${email}</a>`)}
      ${row('Phone',           mobile)}
      ${row('Position / Note', message)}
    </table>
    ${attachments.length
      ? `<p style="font-size:13px;color:#555;margin-top:12px;">
           📎 ${attachments.length} attachment(s) included (resume / cover letter).
         </p>`
      : ''}`;

  const teamMail = {
    from:    FROM,
    to:      TO_TEAM,
    replyTo: `"${name}" <${email}>`,
    subject: `[Career Application] ${name}${message ? ' – ' + message.substring(0, 50) : ''}`,
    html:    htmlWrap('New Career Application', teamBody),
    attachments,
  };

  const userContent = `
    <p>Thank you for your interest in joining <strong>Supra Controls Pvt Ltd</strong>.
       We have received your application and our HR team will review it shortly.</p>
    <p>If your profile matches our current openings, we will get in touch with you
       within <strong>5–7 business days</strong>.</p>
    <p style="font-size:14px;color:#555;">
      <strong>Note:</strong> ${message || 'General Application'}
    </p>`;

  const userMail = {
    from:    FROM,
    to:      email,
    subject: `Thank You for Your Application – Supra Controls`,
    html:    ackHtml(name, userContent),
  };

  try {
    await Promise.all([
      transporter.sendMail(teamMail),
      transporter.sendMail(userMail),
    ]);
    res.status(200).send('Email sent successfully');
  } catch (err) {
    console.error('Careers email error:', err);
    res.status(500).send('Failed to send email');
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
