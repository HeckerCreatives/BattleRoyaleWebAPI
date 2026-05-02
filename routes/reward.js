const router = require("express").Router()
const { protectsuperadmin } = require("../middleware/middleware")
const { grantrewards } = require("../controllers/rewards")

router
    .post("/grantrewards", protectsuperadmin, grantrewards)

module.exports = router