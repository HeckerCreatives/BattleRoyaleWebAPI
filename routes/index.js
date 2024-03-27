const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"))
    app.use("/user", require("./user"))
    app.use("/maintenance", require("./maintenance"))
}

module.exports = routers