const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"));  // <-- Pass io here
    app.use("/content", require('./content'));
    app.use("/energy", require("./energy"))
    app.use("/inbox", require("./inbox"));
    app.use("/investor", require("./investor"));
    app.use("/inventory", require("./inventory"));
    app.use("/leaderboard", require("./leaderboard"))
    app.use("/maintenance", require("./maintenance"));
    app.use("/marketplace", require("./marketplace"));
    app.use("/matchhistory", require("./matchhistory"));
    app.use("/news", require("./news"));
    app.use("/newsletter", require("./newsletter"));
    app.use("/pinata", require("./pinata"))
    app.use("/season", require("./season"))
    app.use("/sociallinks", require("./sociallinks"));
    app.use("/staffusers", require("./staffusers"));
    app.use("/subscription", require("./subscription"));
    app.use("/uploads", require('./picture'));
    app.use("/title", require("./title"));
    app.use("/user", require("./user"));
    app.use("/usergamedetails", require("./usergamedetails"))
    app.use("/version", require("./version"))
    app.use("/quest", require("./quest"))
};

module.exports = routers;


