const https = require("https");

exports.pushnotificationsend = async (templateId) => {
  const data = JSON.stringify({
    app_id: `${process.env.ONE_SIGNAL_APP_ID}`,
    included_segments: ["All"],
    template_id: templateId           // use your OneSignal template
  });

  const options = {
    hostname: "api.onesignal.com",
    port: 443,
    path: "/notifications?c=push",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${process.env.ONE_SIGNAL_API_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    res.on("data", (d) => process.stdout.write(d));
  });

  req.on("error", (e) => console.error(e));
  req.write(data);
  req.end();
}

exports.pushcustomnotificationsend = async (templateId, title, content) => {
  const data = JSON.stringify({
    app_id: `${process.env.ONE_SIGNAL_APP_ID}`,
    included_segments: ["All"],
    template_id: templateId           // use your OneSignal template
  });

  const options = {
    hostname: "api.onesignal.com",
    port: 443,
    path: "/notifications?c=push",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${process.env.ONE_SIGNAL_API_KEY}`
    },
    message: {
        custom_data: {
            "title": title,
            "content": content
        }
    }
  };

  const req = https.request(options, (res) => {
    res.on("data", (d) => process.stdout.write(d));
  });

  req.on("error", (e) => console.error(e));
  req.write(data);
  req.end();
}