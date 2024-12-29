const telegramAuthToken = `7828885137:AAEjmiAZU9F9JMPDmkXcXM190IReePUPbp8`; // Replace with your actual bot token
const webhookEndpoint = "/endpoint";
const adminChatId = "6470739798"; // Replace with the admin's Telegram user ID
const requiredChannels = ["@linuxPredictor", "@VenomPredictor"]; // Replace with your channel usernames
const BIG_DADDY_ISSUE_API_URL = "https://api.bigdaddygame.cc/api/webapi/GetGameIssue";
const MAX_ATTEMPTS = 1; // Maximum number of attempts for API requests
const BACKOFF_TIME = 1000; // Time in milliseconds between retry attempts

// In-memory state to track verification status for each user
const userVerificationState = {};

addEventListener("fetch", (event) => {
  event.respondWith(handleIncomingRequest(event));
});

async function handleIncomingRequest(event) {
  let url = new URL(event.request.url);
  let path = url.pathname;
  let method = event.request.method;
  let workerUrl = `${url.protocol}//${url.host}`;

  if (method === "POST" && path === webhookEndpoint) {
    const update = await event.request.json();
    event.waitUntil(processUpdate(update));
    return new Response("Ok");
  } else if (method === "GET" && path === "/configure-webhook") {
    const url = `https://api.telegram.org/bot${telegramAuthToken}/setWebhook?url=${workerUrl}${webhookEndpoint}`;

    const response = await fetch(url);

    if (response.ok) {
      return new Response("Webhook set successfully", { status: 200 });
    } else {
      return new Response("Failed to set webhook", { status: response.status });
    }
  } else {
    return new Response("Not found", { status: 404 });
  }
}

async function processUpdate(update) {
  if (update.message) {
    const chatId = update.message.chat.id;

    if (update.message.text && update.message.text === "/start") {
      await handleStartCommand(update);
    } else if (update.message.photo) {
      await handlePaymentScreenshot(update);
    }
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

async function fetchBigDaddyTrendsData() {
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: "Bearer YOUR_ACTUAL_TOKEN_HERE", // Replace with a valid token
        Origin: "https://bigdaddygame.in",
        Referer: "https://bigdaddygame.in/",
      };

      const jsonData = {
        typeId: 1,
        language: 0,
        random: "b53936b3b3ce49de84c6668296ea0e78",
        signature: "D488FE99C61193158422C1890F964D40",
        timestamp: 1735365120,
      };

      const response = await fetch(BIG_DADDY_ISSUE_API_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(jsonData),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.issueNumber;
      } else {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_TIME * attempt));
      }
    } catch (error) {
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_TIME * attempt));
    }
  }

  throw new Error("Failed to fetch Big Daddy trends data after maximum attempts.");
}

async function handleStartCommand(update) {
  const chatId = update.message.chat.id;
  const userId = update.message.from.id;
  const userName =
    `${update.message.from.first_name || ""} ${update.message.from.last_name || ""}`.trim() ||
    update.message.from.username;

  const joinedAll = await checkChannelMembership(userId);

  if (joinedAll) {
    await sendWelcomeMessage(chatId);
  } else {
    await sendJoinMessage(chatId, userName);
  }
}

async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const callbackData = query.data;

  if (callbackData.startsWith("approvesilver_")) {
    const userId = callbackData.split("_")[1];
    await approvesilverRequest(userId, messageId);
  } else if (callbackData.startsWith("rejectsilver_")) {
    const userId = callbackData.split("_")[1];
    await rejectRequest(userId, messageId);
  } else if (callbackData.startsWith("approvegold_")) {
    const userId = callbackData.split("_")[1];
    await approvegoldRequest(userId, messageId);
  } else if (callbackData.startsWith("rejectgold_")) {
    const userId = callbackData.split("_")[1];
    await rejectRequest(userId, messageId);
  } else if (callbackData.startsWith("approvediamond_")) {
    const userId = callbackData.split("_")[1];
    await approvediamondRequest(userId, messageId);
  } else if (callbackData.startsWith("rejectdiamond_")) {
    const userId = callbackData.split("_")[1];
    await rejectRequest(userId, messageId);
  } else if (callbackData === "verify_silver_payment") {
    await startsilverVerification(chatId);
 } else if (callbackData === "verify_gold_payment") {
    await startgoldVerification(chatId);
 } else if (callbackData === "verify_diamond_payment") {
    await startdiamondVerification(chatId);
  } else if (callbackData === "cancel_verification") {
    await cancelVerification(chatId, messageId);
    await deleteMessage(chatId, messageId);
  } else if (callbackData === "verify_join") {
    const userId = query.from.id;
    const joinedAll = await checkChannelMembership(userId);
    if (joinedAll) {
      await deleteMessage(chatId, messageId);
      await sendWelcomeMessage(chatId);
    } else {
      await showWarningPopup(query.id);
    }
  } else if (callbackData === "my_account") {
    const userId = query.from.id;
    const userName =
      `${query.from.first_name || ""} ${query.from.last_name || ""}`.trim() ||
      query.from.username;

    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    const formatter = new Intl.DateTimeFormat("en-IN", options);
    const formattedDateTime = formatter.format(new Date());
    const [date] = formattedDateTime.split(", ");

    const accountReport = `🌴 *Account Report*\n*━━━━━━━━━━━*\n👤 *Name*: ${userName}\n🆔 *User ID*: ${userId}\n❗ *Account Status*: ❌ Inactive\n\n🔒 Your membership is currently *inactive*, restricting access to premium features.\n*━━━━━━━━━━━*\n⏱ *Status report taken on* ${date}\n\nUpgrade today to enjoy the full suite of benefits and elevate your experience.`;

    await updateInlineKeyboard(chatId, messageId, accountReport);
  } else if (callbackData === "main_menu" || callbackData === "back_menu") {
    const newKeyboard = {
      inline_keyboard: [
        [
          { text: "📊 Track Trends", callback_data: "track_trends" },
          { text: "👤 My Account", callback_data: "my_account" },
        ],
        [
          { text: "📞 Support", callback_data: "support" },
          { text: "🔐 Get Access", callback_data: "get_access" },
        ],
        [{ text: "📈 Prediction", callback_data: "prediction" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `*Welcome to Linux Miner Bot! 🎉*\n\n🎯 _Your trusted partner for accurate predictions across all color trading games._\n\n*Why Choose Linux Miner Bot?*\n💡 *User-Friendly*: Intuitive and easy-to-navigate interface.\n⚡ *Lightning-Fast Predictions*: Instant and reliable results.\n📊 *Track Trends*: Stay ahead by analyzing the latest game trends.\n🔗 *API-Driven Accuracy*: Powered by original game APIs for unmatched precision.\n\nExplore the options below to access predictions and experience the ultimate edge in color trading games.`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "support") {
    const newKeyboard = {
      inline_keyboard: [
        [
          { text: "🔗 Bot Connections", callback_data: "bot_connections" },
          { text: "How to use ❓", callback_data: "how_to_use" },
        ],
        [{ text: "💬 Customer Service", url: "https://t.me/supraowner" }],
        [{ text: "Main Menu", callback_data: "main_menu" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `Choose one of the options below to get support for our Linux Miner bot:`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "get_access") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "🥈 Get Silver Access", callback_data: "silver_access" }],
        [{ text: "🥇 Get Gold Access", callback_data: "gold_access" }],
        [{ text: "💎 Get Diamond Access", callback_data: "diamond_access" }],
        [{ text: "Main Menu", callback_data: "main_menu" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `📜 *Choose Your Exclusive License!*\n\n1️⃣ *Silver License – ₹999*\n\n *•* 6 Days Access\n *•* Daily Prediction(12): 4 Numbers, 4 Big/Small, 4 Colors\n *•* 100% Accuracy & 24/7 Access\n——————————————\n2️⃣ *Gold License – ₹1499*\n\n *•* 15 Days Access\n *•* Daily Prediction(30): 10 Numbers, 10 Big/Small, 10 Colors\n *•* Priority Support & 24/7 Access\n——————————————\n3️⃣ *Platinum License – ₹2199*\n\n *•* 28 Days VIP Access\n *•* Unlimited Predictions: Numbers, Big/Small, Colors\n *•* VIP Support & Exclusive Strategies\n\n🎥 [Watch Tutorial](https://t.me/Linuxpredictor)`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "silver_access") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "💳 Buy Now", callback_data: "buy_silver" }],
        [{ text: "⚡ Upgrade to Gold", callback_data: "gold_access" }],
        [{ text: "⚡ Upgrade to Diamond", callback_data: "diamond_access" }],
        [{ text: "🔙 Back", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `🥈 *Silver Access*\n\n💰 *Price:* ₹999\n\n✨ *Plan Highlights:*\n*• 🗓️ 6 Days Silver Access*\n*• 📈 Daily 12 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🕒 24/7 Availability*\n*• 💡 Exclusive Insights*\n\n🔔 🔼 *Upgrade to Gold or Diamond* for more benefits!\n\n📹 [Watch Tutorial](https://t.me/Linuxpredictor)\n\n📌 *Note:*\n- If your order expires, click *Back*, select a plan, and restart the process.\n- If payment fails, click *Back*, choose a plan, and press *Buy Now* to request a new payment.\n\n👉 *Complete your purchase to activate your access and enjoy exclusive benefits!*`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "gold_access") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "💳 Buy Now", callback_data: "buy_gold" }],
        [{ text: "🔙 Back", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `🥇 *Gold Access*\n\n💰 *Price:* ₹1,499\n\n✨ *Plan Highlights:*\n*• 🗓️ 15 Days Silver Access*\n*• 📈 Daily 30 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🎯 Priority Support*\n*• 🕒 24/7 Availability*\n*• 🚀 Advance Insights*\n\n📹 [Watch Tutorial](https://t.me/Linuxpredictor)\n\n📌 *Note:*\n- If your order expires, click *Back*, select a plan, and restart the process.\n- If payment fails, click *Back*, choose a plan, and press *Buy Now* to request a new payment.\n\n👉 *Complete your purchase to activate your access and enjoy exclusive benefits!*`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "diamond_access") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "💳 Buy Now", callback_data: "buy_diamond" }],
        [{ text: "🔙 Back", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `💎 *Diamond Access*\n\n💰 *Price:* ₹2,199\n\n✨ *Plan Highlights:*\n*• 🗓️ 28 Days Silver Access*\n*• 📈 Unlimited Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 💼 VIP Support*\n*• 📊 Personal Strategies*\n*• 🕒 24/7 Service*\n*• 🌟 Exclusive Bonuses*\n*• 🚀 Advance Insights*\n\n📹 [Watch Tutorial](https://t.me/Linuxpredictor)\n\n📌 *Note:*\n- If your order expires, click *Back*, select a plan, and restart the process.\n- If payment fails, click *Back*, choose a plan, and press *Buy Now* to request a new payment.\n\n👉 *Complete your purchase to activate your access and enjoy exclusive benefits!*`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "buy_silver") {
    const newKeyboard = {
      inline_keyboard: [
        [
          { text: "UPI Super", callback_data: "upi_super_silver" },
          { text: "UPI Fast", callback_data: "upi_fast_silver" },
        ],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `*💳 Select Your Payment Method for Silver Access*`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "buy_gold") {
    const newKeyboard = {
      inline_keyboard: [
        [
          { text: "UPI Super", callback_data: "upi_super_gold" },
          { text: "UPI Fast", callback_data: "upi_fast_gold" },
        ],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `*💳 Select Your Payment Method for Gold Access*`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "buy_diamond") {
    const newKeyboard = {
      inline_keyboard: [
        [
          { text: "UPI Super", callback_data: "upi_super_diamond" },
          { text: "UPI Fast", callback_data: "upi_fast_diamond" },
        ],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: `*💳 Select Your Payment Method for Diamond Access*`,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
        } else if (callbackData === "upi_super_silver") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "✅ Verify Payment", callback_data: "verify_silver_payment" }],
        [{ text: "🔄 Generate QR Code", callback_data: "generate_qr_silver" }],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: "💳 *Payment for Silver Access*\n\n💰 *Price:* ₹999\n\n✨ *Plan Highlights:*\n*• 🗓️ 6 Days Silver Access*\n*• 📈 Daily 12 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🕒 24/7 Availability*\n*• 💡 Exclusive Insights*\n\n🚀 *Proceed with Payment:*\n• 📲 *UPI ID:* `supramod@idfcbank`\n• 💰 *Amount:* ₹999\n\nPlease make the payment to the above UPI ID using any UPI app.\nOnce you've completed the payment, click the *Verify Payment* button below.\n\n💡 [Need Help? Click here](https://t.me/supraowner)",
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "generate_qr_silver") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "✅ Verify Payment", callback_data: "verify_silver_payment" }],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: "💳 *Payment for Silver Access*\n\n💰 *Price:* ₹999\n\n✨ *Plan Highlights:*\n*• 🗓️ 6 Days Silver Access*\n*• 📈 Daily 12 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🕒 24/7 Availability*\n*• 💡 Exclusive Insights*\n\n🚀 *Proceed with Payment:*\n• 📲 *UPI ID:* `supramod@idfcbank`\n• 💰 *Amount:* ₹999\n\n🔷 *Scan the QR code below to make the payment:*\nhttps://api.qrserver.com/v1/create-qr-code/?size=500x500&data=upi%3A%2F%2Fpay%3Fpa%3Dsupramod%2540idfcbank%26am%3D999%26pn%3DYour%2520Payee%2520Name%26cu%3DINR\n\nOnce you've completed the payment, click the *Verify Payment* button below.\n\n💡 [Need Help? Click here](https://t.me/supraowner)",
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "upi_super_gold") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "✅ Verify Payment", callback_data: "verify_gold_payment" }],
        [{ text: "🔄 Generate QR Code", callback_data: "generate_qr_gold" }],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: "💳 *Payment for Gold Access*\n\n💰 *Price:* ₹1,499\n\n✨ *Plan Highlights:*\n*• 🗓️ 15 Days Silver Access*\n*• 📈 Daily 30 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🎯 Priority Support*\n*• 🕒 24/7 Availability*\n*• 🚀 Advance Insights*\n\n🚀 *Proceed with Payment:*\n• 📲 *UPI ID:* `supramod@idfcbank`\n• 💰 *Amount:* ₹1,499\n\nPlease make the payment to the above UPI ID using any UPI app.\nOnce you've completed the payment, click the *Verify Payment* button below.\n\n💡 [Need Help? Click here](https://t.me/supraowner)",
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "generate_qr_gold") {
    const newKeyboard = {
      inline_keyboard: [
        [{ text: "✅ Verify Payment", callback_data: "verify_gold_payment" }],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: "💳 *Payment for Gold Access*\n\n💰 *Price:* ₹1,499\n\n✨ *Plan Highlights:*\n*• 🗓️ 15 Days Silver Access*\n*• 📈 Daily 30 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🎯 Priority Support*\n*• 🕒 24/7 Availability*\n*• 🚀 Advance �Insights*\n\n🚀 *Proceed with Payment:*\n• 📲 *UPI ID:* `supramod@idfcbank`\n• 💰 *Amount:* ₹1,499\n\n🔷 *Scan the QR code below to make the payment:*\nhttps://api.qrserver.com/v1/create-qr-code/?size=500x500&data=upi%3A%2F%2Fpay%3Fpa%3Dsupramod%2540idfcbank%26am%3D1499%26pn%3DYour%2520Payee%2520Name%26cu%3DINR\n\nOnce you've completed the payment, click the *Verify Payment* button below.\n\n💡 [Need Help? Click here](https://t.me/supraowner)",
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "upi_super_silver") {
    const newKeyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Verify Payment",
            callback_data: "verify_diamond_payment",
          },
        ],
        [{ text: "🔄 Generate QR Code", callback_data: "generate_qr_diamond" }],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: "💳 *Payment for Diamond Access*\n\n💰 *Price:* ₹2,199\n\n✨ *Plan Highlights:*\n*• 🗓️ 28 Days Silver Access*\n*• 📈 Unlimited Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 💼 VIP Support*\n*• 📊 Personal Strategies*\n*• 🕒 24/7 Service*\n*• 🌟 Exclusive Bonuses*\n*• 🚀 Advance Insights*\n\n🚀 *Proceed with Payment:*\n• 📲 *UPI ID:* `supramod@idfcbank`\n• 💰 *Amount:* ₹2,199\n\nPlease make the payment to the above UPI ID using any UPI app.\nOnce you've completed the payment, click the *Verify Payment* button below.\n\n💡 [Need Help? Click here](https://t.me/supraowner)",
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  } else if (callbackData === "generate_qr_diamond") {
    const newKeyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Verify Payment",
            callback_data: "verify_diamond_payment",
          },
        ],
        [{ text: "🔙 Back (Plans)", callback_data: "get_access" }],
      ],
    };
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: "💳 *Payment for Diamond Access*\n\n💰 *Price:* ₹2,199\n\n✨ *Plan Highlights:*\n*• 🗓️ 28 Days Silver Access*\n*• 📈 Unlimited Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 💼 VIP Support*\n*• 📊 Personal Strategies*\n*• 🕒 24/7 Service*\n*• 🌟 Exclusive Bonuses*\n*• 🚀 Advance Insights*\n\n🚀 *Proceed with Payment:*\n• 📲 *UPI ID:* `supramod@idfcbank`\n• 💰 *Amount:* ₹2,199\n\n🔷 *Scan the QR code below to make the payment:*\nhttps://api.qrserver.com/v1/create-qr-code/?size=500x500&data=upi%3A%2F%2Fpay%3Fpa%3Dsupramod%2540idfcbank%26am%3D2199%26pn%3DYour%2520Payee%2520Name%26cu%3DINR\n\nOnce you've completed the payment, click the *Verify Payment* button below.\n\n💡 [Need Help? Click here](https://t.me/supraowner)",
      parse_mode: "Markdown",
      reply_markup: JSON.stringify(newKeyboard),
    };

    await editMessage(message);
  }
}

async function editMessage(message) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/editMessageText`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  return response.json();
}
async function checkChannelMembership(userId) {
  for (const channel of requiredChannels) {
    const url = `https://api.telegram.org/bot${telegramAuthToken}/getChatMember?chat_id=${channel}&user_id=${userId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok || ["left", "kicked"].includes(data.result.status)) {
      return false;
    }
  }
  return true;
}

async function updateInlineKeyboard(chatId, messageId, newText) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/editMessageText`;
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: newText,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔐 Get Access (Upgrade)", callback_data: "get_access" }],
        [{ text: "🔙 Back", callback_data: "back_menu" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendJoinMessage(chatId, userName) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: `*Hello* *${userName}*,\n\nWelcome! 🌟 To access exclusive content, please join the following channels:\n\n- *Linux Predictor*: [Join](https://t.me/linuxPredictor) 📈\n- *Venom Predictor*: [Join](https://t.me/VenomPredictor) 📊\n\nIf you need assistance, please feel free to reach out. 📩\n\nBest regards,\n@LinuxPredictor`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Linux Predictor", url: "https://t.me/linuxPredictor" },
          { text: "Venom Predictor", url: "https://t.me/VenomPredictor" },
        ],
        [{ text: "Verify", callback_data: "verify_join" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendWelcomeMessage(chatId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: "*Welcome to Linux Miner Bot! 🎉*\n\n🎯 _Your trusted partner for accurate predictions across all color trading games._\n\n*Why Choose Linux Miner Bot?*\n💡 *User-Friendly*: Intuitive and easy-to-navigate interface.\n⚡ *Lightning-Fast Predictions*: Instant and reliable results.\n📊 *Track Trends*: Stay ahead by analyzing the latest game trends.\n🔗 *API-Driven Accuracy*: Powered by original game APIs for unmatched precision.\n\nExplore the options below to access predictions and experience the ultimate edge in color trading games.",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 Track Trends", callback_data: "track_trends" },
          { text: "👤 My Account", callback_data: "my_account" },
        ],
        [
          { text: "📞 Support", callback_data: "support" },
          { text: "🔐 Get Access", callback_data: "get_access" },
        ],
        [{ text: "📈 Prediction", callback_data: "prediction" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function startsilverVerification(chatId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: "📸 *Please send the payment screenshot with the UTR number in the caption.*",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "cancel_verification" }],
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.ok) {
    userVerificationState[chatId] = {
      status: "pending",
      messageId: data.result.message_id,
    };
  }
}

async function cancelVerification(chatId, messageId) {
  delete userVerificationState[chatId];
  await sendMessage(
    chatId,
    "",
  );
}

async function handlePaymentScreenshot(update) {
  const chatId = update.message.chat.id;

  if (
    !userVerificationState[chatId] ||
    userVerificationState[chatId].status !== "pending"
  ) {
    await sendMessage(
      chatId,
      "",
    );
    return;
  }

  const { messageId } = userVerificationState[chatId];
  await deleteMessage(chatId, messageId);

  const caption = update.message.caption || "No caption provided";
  const userId = update.message.from.id;
  const username = update.message.from.username || "No username";

  delete userVerificationState[chatId];

  await sendMessage(
    chatId,
    "✅ *Thank you for submitting your payment screenshot!*\n📌 *Please wait while our team reviews it. You’ll be notified once it is approved.*",
    null,
    true,
  );

  const adminPayload = {
    chat_id: adminChatId,
    photo: update.message.photo[update.message.photo.length - 1].file_id,
    caption: `📸 (silver) Payment Screenshot Submitted\n\n👤 *Username:* @${username}\n🆔 *User ID:* ${userId}\n\n✏️ *Caption:* ${caption}`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve (silver)", callback_data: `approvesilver_${userId}` },
          { text: "❌ Reject", callback_data: `rejectsilver_${userId}` },
        ],
      ],
    },
  };

  await fetch(`https://api.telegram.org/bot${telegramAuthToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminPayload),
  });
}

async function approvesilverRequest(userId, messageId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: userId,
    text: "🎉 Congratulations!, Your payment for the Silver plan has been approved.\n\n*• 🗓️ 6 Days Silver Access*\n*• 📈 Daily 12 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🕒 24/7 Availability*\n*• 💡 Exclusive Insights*\n\nYour access has been successfully activated. You now have full access to request predictions and explore all the features of our service. Thank you for choosing us, and we wish you a seamless and enjoyable experience!",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📈 Prediction", callback_data: "prediction" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

       // Notify admin about the approval
  await sendMessage(
    adminChatId,
    `✅ Silver Payment approved for *User ID:* ${userId}.`,
    messageId,
  );
}

async function approvegoldRequest(userId, messageId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: userId,
    text: "🎉 Congratulations!, Your payment for the Silver plan has been approved.\n\n*• 🗓️ 6 Days Silver Access*\n*• 📈 Daily 12 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🕒 24/7 Availability*\n*• 💡 Exclusive Insights*\n\nYour access has been successfully activated. You now have full access to request predictions and explore all the features of our service. Thank you for choosing us, and we wish you a seamless and enjoyable experience!",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📈 Prediction", callback_data: "prediction" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Notify admin about the approval
  await sendMessage(
    adminChatId,
    `✅ gold Payment approved for *User ID:* ${userId}.`,
    messageId,
  );
}

async function approvediamondRequest(userId, messageId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: userId,
    text: "🎉 Congratulations!, Your payment for the Silver plan has been approved.\n\n*• 🗓️ 6 Days Silver Access*\n*• 📈 Daily 12 Predictions*: Numbers, Big/Small & Colour\n*• 🎯 100% Accuracy*\n*• 🕒 24/7 Availability*\n*• 💡 Exclusive Insights*\n\nYour access has been successfully activated. You now have full access to request predictions and explore all the features of our service. Thank you for choosing us, and we wish you a seamless and enjoyable experience!",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📈 Prediction", callback_data: "prediction" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Notify admin about the approval
  await sendMessage(
    adminChatId,
    `✅ diamond Payment approved for *User ID:* ${userId}.`,
    messageId,
  );
}



async function rejectRequest(userId, messageId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;

  // Notify the user about rejection
  const userPayload = {
    chat_id: userId,
    text: "🚫 *Your payment was not approved due to one of the following reasons:*\n\n- Fake or incorrect UTR number.\n- Payment was never made.\n- Payment amount doesn't match the selected plan.\n\n💡 *Solution:*\nPlease make the payment if not done and submit real proof.",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🔐 Get Access",
            callback_data: "get_access",
          },
        ],
        [{ text: "Help ❓", url: "https://t.me/supraowner" }],
      ],
    },
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userPayload),
  });

  // Notify the admin about the rejection
  const adminPayload = {
    chat_id: adminChatId,
    text: `❌ Silver Payment rejected for *User ID:* ${userId}.`,
    parse_mode: "Markdown",
    reply_to_message_id: messageId,
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminPayload),
  });
}

async function sendMessage(
  chatId,
  text,
  replyToMessageId = null,
  isBold = false,
  keyboard = null,
) {
  const payload = {
    chat_id: chatId,
    text: isBold ? `*${text}*` : text,
    parse_mode: isBold ? "Markdown" : undefined,
    reply_to_message_id: replyToMessageId,
    reply_markup: keyboard || undefined,
  };

  await fetch(`https://api.telegram.org/bot${telegramAuthToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function deleteMessage(chatId, messageId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/deleteMessage`;
  const payload = {
    chat_id: chatId,
    message_id: messageId,
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}


async function startgoldVerification(chatId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: "📸 *Please send the payment screenshot with the UTR number in the caption for Gold Plan.*",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "cancel_verification" }],
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.ok) {
    userVerificationState[chatId] = {
      status: "pending",
      messageId: data.result.message_id,
    };
  }
}


async function handleGoldPaymentScreenshot(update) {
  const chatId = update.message.chat.id;

  if (
    !userVerificationState[chatId] ||
    userVerificationState[chatId].status !== "pending"
  ) {
    await sendMessage(chatId, "No active verification found.");
    return;
  }

  const { messageId } = userVerificationState[chatId];
  await deleteMessage(chatId, messageId);

  const caption = update.message.caption || "No caption provided";
  const userId = update.message.from.id;
  const username = update.message.from.username || "No username";

  delete userVerificationState[chatId];

  await sendMessage(
    chatId,
    "✅ *Thank you for submitting your payment screenshot!*\n📌 *Please wait while our team reviews it. You’ll be notified once it is approved.*",
    null,
    true
  );

  const adminPayload = {
    chat_id: adminChatId,
    photo: update.message.photo[update.message.photo.length - 1].file_id,
    caption: `📸 (Gold) Payment Screenshot Submitted\n\n👤 *Username:* @${username}\n🆔 *User ID:* ${userId}\n\n✏️ *Caption:* ${caption}`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve (Gold)", callback_data: `approvegold_${userId}` },
          { text: "❌ Reject", callback_data: `rejectgold_${userId}` },
        ],
      ],
    },
  };

  await fetch(`https://api.telegram.org/bot${telegramAuthToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminPayload),
  });
}

async function startdiamondVerification(chatId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: "📸 *Please send the payment screenshot with the UTR number in the caption for Diamond Plan.*",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "cancel_verification" }],
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.ok) {
    userVerificationState[chatId] = {
      status: "pending",
      messageId: data.result.message_id,
    };
  }
}

async function handleDiamondPaymentScreenshot(update) {
  const chatId = update.message.chat.id;

  if (
    !userVerificationState[chatId] ||
    userVerificationState[chatId].status !== "pending"
  ) {
    await sendMessage(chatId, "No active verification found.");
    return;
  }

  const { messageId } = userVerificationState[chatId];
  await deleteMessage(chatId, messageId);

  const caption = update.message.caption || "No caption provided";
  const userId = update.message.from.id;
  const username = update.message.from.username || "No username";

  delete userVerificationState[chatId];

  await sendMessage(
    chatId,
    "✅ *Thank you for submitting your payment screenshot!*\n📌 *Please wait while our team reviews it. You’ll be notified once it is approved.*",
    null,
    true
  );

  const adminPayload = {
    chat_id: adminChatId,
    photo: update.message.photo[update.message.photo.length - 1].file_id,
    caption: `📸 (Diamond) Payment Screenshot Submitted\n\n👤 *Username:* @${username}\n🆔 *User ID:* ${userId}\n\n✏️ *Caption:* ${caption}`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve (Diamond)", callback_data: `approvediamond_${userId}` },
          { text: "❌ Reject", callback_data: `rejectdiamond_${userId}` },
        ],
      ],
    },
  };

  await fetch(`https://api.telegram.org/bot${telegramAuthToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminPayload),
  });
}



async function showWarningPopup(callbackQueryId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
    text: "❌ You have not joined all the required channels. Please join them to proceed.",
    show_alert: true,
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
