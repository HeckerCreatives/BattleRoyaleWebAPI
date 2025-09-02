const { getplayermatchhistory, getmatchhistory } = require("../controllers/matchhistory")
const { protectsuperadmin, protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
 .get("/admin/viewmatchhistory", protectsuperadmin, getplayermatchhistory)
 .get("/viewmatchhistory", protectplayer, getmatchhistory)

module.exports = router