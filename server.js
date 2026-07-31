const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// CONFIGURATIONS
const BOT_TOKEN = '8847929104:AAHe7yo9CcWm3V1ysjfHnHUtCy7YnE1LbPg';
const MY_CHAT_ID = '6809358372';
const GMAIL_USER = 'alemayehufanuel15@gmail.com'; // ⚠️ የራስህን Gmail እዚህ ተካ
const GMAIL_APP_PASS = 'tpovvjhqnzaohlwb';

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS
  }
});

// 1. ENDPOINT: ከዌብሳይት ወደ Telegram Order መላኪያ
app.post('/api/order', async (req, res) => {
  const { name, phone, address, email, title, size, price, qty } = req.body;

  const messageText = `
📦 *NEW BANNER ORDER!*
-------------------------
👤 *Name:* ${name}
📞 *Phone:* ${phone}
📍 *Address:* ${address}
✉️ *Email:* ${email}
🖼️ *Banner:* ${title} (${size})
🔢 *Qty:* ${qty}
💰 *Total:* ${(price * qty).toLocaleString()} ETB
`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: MY_CHAT_ID,
      text: messageText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Approve & Send Email',
              callback_data: JSON.stringify({ action: 'approve', email, name, title })
            }
          ]
        ]
      }
    });

    res.status(200).json({ success: true, message: 'Order sent to Telegram successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send order' });
  }
});

// 2. ENDPOINT: Telegram ላይ Approve ሲጫኑ አውቶማቲክ ኢሜይል መላኪያ
app.post('/api/telegram-webhook', async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const callback = update.callback_query;
    const data = JSON.parse(callback.data);

    if (data.action === 'approve') {
      const { email, name, title } = data;

      const mailOptions = {
        from: `Banner Store <${GMAIL_USER}>`,
        to: email,
        subject: '🎉 Your Banner Order is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #28a745; margin-top: 0;">ሰላም ${name}!</h2>
            <p style="font-size: 1.05rem; color: #333; line-height: 1.6;">
              ያዘዙት <strong>${title}</strong> ባነር ተዘጋጅቷል! 
            </p>
            <p style="font-size: 1rem; color: #555; line-height: 1.6;">
              እባክዎን በቴሌግራም ቦታችን በኩል ክፍያ ፈጽመው ባነርዎን ይረከቡ።
            </p>
            <div style="margin-top: 25px; text-align: center;">
              <a href="https://t.me/your_bot_username" style="display: inline-block; padding: 12px 30px; background: #0088cc; color: #fff; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 1rem;">ወደ Telegram Bot ሂድ</a>
            </div>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          callback_query_id: callback.id,
          text: '✅ Email sent to customer!'
        });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
          chat_id: MY_CHAT_ID,
          message_id: callback.message.message_id,
          text: callback.message.text + '\n\nSTATUS: ✅ *APPROVED & EMAIL SENT*',
          parse_mode: 'Markdown'
        });

      } catch (err) {
        console.error('Email Error:', err);
      }
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));