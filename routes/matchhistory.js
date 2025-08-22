const { getplayermatchhistory, getmatchhistory } = require("../controllers/matchhistory")
const { protectsuperadmin } = require("../middleware/middleware")

const router = require("express").Router()

router
 .get("/admin/viewmatchhistory", protectsuperadmin, getplayermatchhistory)
 .get("/viewmatchhistory", protectsuperadmin, getmatchhistory)

module.exports = router