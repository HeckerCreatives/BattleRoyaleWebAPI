const { grantRewardsToPlayer } = require("../utils/rewards");


exports.grantrewards = async (req, res) => {
    const { userid, rewards } = req.body

    if (!Array.isArray(rewards) || rewards.length === 0) {
        return res.status(400).json({ message: "failed", data: "Rewards array is required." })
    }

    await grantRewardsToPlayer(userid, rewards)

    return res.json({
        message: "success",
        data: {
            granted: rewards.length
        }
    })
}