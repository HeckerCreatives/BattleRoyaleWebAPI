const router = require("express").Router()
const { newsmessage, viewplayermessage, messageplayers } = require("../controllers/inbox")
const { protectsuperadmin } = require("../middleware/middleware")

router
    .get("/viewplayermessage", protectsuperadmin, viewplayermessage)
    .post("/newsmessage", protectsuperadmin, newsmessage)
    .post("/messageplayers", protectsuperadmin, messageplayers)

module.exports = router;
