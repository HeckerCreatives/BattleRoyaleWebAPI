const router = require("express").Router()
const { newsmessage, viewplayermessage } = require("../controllers/inbox")
const { protectsuperadmin } = require("../middleware/middleware")

router
    .get("/viewplayermessage", protectsuperadmin, viewplayermessage)
    .post("/newsmessage", protectsuperadmin, newsmessage)

module.exports = router;
