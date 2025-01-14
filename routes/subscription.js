const { Subscribe, Unsubscribe, getSubscribers } = require("../controllers/subscription")

const router = require("express").Router()

router
 .post("/subscribe", Subscribe)
 .post("/unsubscribe", Unsubscribe)
 .get("/getsubscribers", getSubscribers)

module.exports = router