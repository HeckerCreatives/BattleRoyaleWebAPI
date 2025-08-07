const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"));  // <-- Pass io here
    app.use("/content", require('./content'));
    app.use("/energy", require("./energy"))
    app.use("/inbox", require("./inbox"));
    app.use("/investor", require("./investor"));
    app.use("/leaderboard", require("./leaderboard"))
    app.use("/maintenance", require("./maintenance"));
    app.use("/news", require("./news"));
    app.use("/newsletter", require("./newsletter"));
    app.use("/season", require("./season"))
    app.use("/sociallinks", require("./sociallinks"));
    app.use("/staffusers", require("./staffusers"));
    app.use("/subscription", require("./subscription"));
    app.use("/uploads", require('./picture'));
    app.use("/title", require("./title"));
    app.use("/user", require("./user"));
    app.use("/usergamedetails", require("./usergamedetails"))
    app.use("/version", require("./version"))
};

module.exports = routers;


