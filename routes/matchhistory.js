const { getplayermatchhistory } = require("../controllers/matchhistory")
const { protectsuperadmin } = require("../middleware/middleware")

const router = require("express").Router()

router
 .get("/admin/viewmatchhistory", protectsuperadmin, getplayermatchhistory)

module.exports = router