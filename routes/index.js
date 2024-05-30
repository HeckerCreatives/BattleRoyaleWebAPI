const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"))
    app.use("/user", require("./user"))
    app.use("/news", require("./news"))
    app.use("/inbox", require("./inbox"))
    app.use("/maintenance", require("./maintenance"))
    app.use("/characters", require("./playercharactersettings"))
    app.use("/uploads", require("./uploads"))
}

module.exports = routers