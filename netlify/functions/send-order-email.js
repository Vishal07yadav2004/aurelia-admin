const tls = require('tls');
const admin = require('firebase-admin');
// console.log('admin keys:', admin ? Object.keys(admin) : admin, 'apps:', admin?.apps);

const ADMIN_UID = process.env.ADMIN_UID;

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

function smtpCommand(socket, command, expectedCodes = ['250']) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) {
        cleanup();
        const code = last.slice(0, 3);
        expectedCodes.includes(code)
          ? resolve(buffer)
          : reject(new Error(`SMTP failed: ${buffer}`));
      }
    };

    const onError = (err) => {
      cleanup();
      reject(new Error(`SMTP socket error: ${err.message}`));
    };

    const onClose = () => {
      cleanup();
      reject(new Error('SMTP connection closed unexpectedly'));
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
    if (command) socket.write(`${command}\r\n`);
  });
}

async function sendGmail({ to, subject, html, text }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const fromName = process.env.GMAIL_FROM_NAME || 'KANYAMAA';
  if (!user || !pass) throw new Error('Gmail env vars missing');

  const cleanTo = String(to || '').trim();
  if (!cleanTo) throw new Error('Recipient email missing');

  const socket = tls.connect(465, 'smtp.gmail.com', { servername: 'smtp.gmail.com' });

  // Make sure a failed/refused TLS handshake rejects instead of hanging forever.
  await new Promise((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', (err) => reject(new Error(`TLS connect failed: ${err.message}`)));
  });

  try {
    await smtpCommand(socket, null, ['220']);
    await smtpCommand(socket, 'EHLO kanyamaa.com');
    await smtpCommand(socket, 'AUTH LOGIN', ['334']);
    await smtpCommand(socket, Buffer.from(user).toString('base64'), ['334']);
    await smtpCommand(socket, Buffer.from(pass).toString('base64'), ['235']);
    await smtpCommand(socket, `MAIL FROM:<${user}>`);
    await smtpCommand(socket, `RCPT TO:<${cleanTo}>`);
    await smtpCommand(socket, 'DATA', ['354']);

    const boundary = `kanyamaa_${Date.now()}`;
    const message = [
      `From: ${fromName.replace(/[\r\n]/g, ' ')} <${user}>`,
      `To: ${cleanTo}`,
      `Subject: ${subject.replace(/[\r\n]/g, ' ')}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      text,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
      '',
      `--${boundary}--`,
      '.',
      '',
    ].join('\r\n');

    await smtpCommand(socket, message);
    await smtpCommand(socket, 'QUIT', ['221']);
  } finally {
    socket.end();
  }
}

const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const fullName = (customer = {}) => `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
const displayOrderId = (order = {}) => order.visibleOrderId || (order.orderNumber ? `#${order.orderNumber}` : '');

function itemsRows(order) {
  return (order.items || []).map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.name || 'Product'}${item.size ? `<br><small>Size: ${item.size}</small>` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.qty || 1}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money((item.price || 0) * (item.qty || 1))}</td>
    </tr>
  `).join('');
}

function verifiedEmail(order) {
  const deliveryDays = process.env.DEFAULT_DELIVERY_DAYS || '5–7';
  return {
    subject: `Your KANYAMAA order ${displayOrderId(order)} is verified`,
    text: `Hi ${fullName(order.customer)}, your order ${displayOrderId(order)} is verified and will be delivered in ${deliveryDays} business days.`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#222;line-height:1.6;">
        <h2>Your order is verified ✨</h2>
        <p>Hi ${fullName(order.customer)},</p>
        <p>Your payment for <strong>${displayOrderId(order)}</strong> has been verified. Your order will be delivered in approximately <strong>${deliveryDays} business days</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;">
          <thead><tr><th align="left">Product</th><th>Qty</th><th align="right">Amount</th></tr></thead>
          <tbody>${itemsRows(order)}</tbody>
        </table>
        <p><strong>Total:</strong> ${money(order.total || order.payableAmount)}</p>
        <p>Thank you for shopping with KANYAMAA.</p>
      </div>`,
  };
}

function shippedEmail(order) {
  const tracking = order.shippingTracking || {};
  return {
    subject: `Your KANYAMAA order ${displayOrderId(order)} has shipped`,
    text: `Hi ${fullName(order.customer)}, your order ${displayOrderId(order)} has shipped. Courier: ${tracking.courierName}. Tracking ID: ${tracking.trackingNumber}.`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#222;line-height:1.6;">
        <h2>Your order is shipped 🚚</h2>
        <p>Hi ${fullName(order.customer)},</p>
        <p>Your order <strong>${displayOrderId(order)}</strong> has been shipped.</p>
        <p><strong>Courier:</strong> ${tracking.courierName || '—'}<br>
        <strong>Tracking ID:</strong> ${tracking.trackingNumber || '—'}</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;">
          <thead><tr><th align="left">Product</th><th>Qty</th><th align="right">Amount</th></tr></thead>
          <tbody>${itemsRows(order)}</tbody>
        </table>
        <p>Thank you for shopping with KANYAMAA.</p>
      </div>`,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    initAdmin();
    const token = event.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Missing auth token' }) };

    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.uid !== ADMIN_UID) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

    const { type, order } = JSON.parse(event.body || '{}');
    if (!order?.customer?.email) return { statusCode: 400, body: JSON.stringify({ error: 'Customer email missing' }) };

    const email = type === 'shipped' ? shippedEmail(order) : verifiedEmail(order);
    await sendGmail({ to: order.customer.email, ...email });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-order-email failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Email failed' }) };
  }
};