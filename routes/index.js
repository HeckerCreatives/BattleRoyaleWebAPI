const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"));  // <-- Pass io here
    app.use("/content", require('./content'));
    app.use("/user", require("./user"));
    app.use("/inbox", require("./inbox"));
    app.use("/investor", require("./investor"));
    app.use("/staffusers", require("./staffusers"));
    app.use("/subscription", require("./subscription"));
    app.use("/maintenance", require("./maintenance"));
    app.use("/news", require("./news"));
    app.use("/newsletter", require("./newsletter"));
    app.use("/sociallinks", require("./sociallinks"));
    app.use("/subscription", require("./subscription"));
    app.use("/staffusers", require("./staffusers"));
    app.use("/content", require('./content'));
    app.use("/uploads", require('./picture'));
    app.use("/user", require("./user"));
    app.use("/usergamedetails", require("./usergamedetails"))
    app.use("/leaderboard", require("./leaderboard"))
    app.use("/energy", require("./energy"))
    app.use("/season", require("./season"))
    app.use("/version", require("./version"))
};

module.exports = routers;


