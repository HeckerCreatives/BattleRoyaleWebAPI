const router = require("express").Router()
const { changepassword } = require("../controllers/staffusers")
const { protectsuperadmin } = require("../middleware/middleware")

router
    .post("/changepassword", protectsuperadmin, changepassword)

module.exports = router;
