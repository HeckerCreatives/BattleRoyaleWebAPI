const { default: mongoose } = require("mongoose");
const Inventory = require("../models/Inventory");
const Marketplace = require("../models/Marketplace");
const Inbox = require("../models/Inbox");
const xpUtils = require("../utils/xp");
const leaderboardUtils = require("../utils/leaderboard");
const energyUtils = require("../utils/energy");


exports.grantRewardsToPlayer = async (playerId, rewards = []) => {
    const ownerId = new mongoose.Types.ObjectId(playerId)

    for (const reward of rewards) {
        if (!reward || !reward.type) continue

        const rewardType = String(reward.type).toLowerCase().trim()
        const rewardAmount = Number(reward.amount) || 0

        if (rewardType === "exp") {
            await xpUtils.addXP(playerId, rewardAmount)
            continue
        }

        if (rewardType === "leaderboard") {
            await leaderboardUtils.addPoints(playerId, rewardAmount)
            continue
        }

        if (rewardType === "energy" && !reward.itemid) {
            await energyUtils.updateEnergy(playerId, rewardAmount)
            continue
        }

        if (!reward.itemid) continue

        const marketItem = await Marketplace.findOne({ itemid: reward.itemid })
        if (!marketItem) continue

        const marketType = String(marketItem.type || "").toLowerCase().trim()
        const inventoryType = marketType || rewardType
        if (inventoryType !== "potion" && inventoryType !== "title" && inventoryType !== "energy") {
            continue
        }
        const itemQuantity = Math.max(1, rewardAmount || 1)

        // Place items in inbox first — user claims them from there
        await Inbox.create({
            owner: new mongoose.Types.ObjectId(playerId),
            type: "reward",
            title: `You received: ${marketItem.itemname}`,
            description: `A reward of ${itemQuantity}x ${marketItem.itemname} is waiting for you.`,
            rewards: [{
                type: inventoryType,
                amount: itemQuantity,
                itemid: marketItem.itemid
            }],
            status: "unopen"
        })
    }
}