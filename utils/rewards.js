const { default: mongoose } = require("mongoose");
const Inventory = require("../models/Inventory");
const Marketplace = require("../models/Marketplace");
const Inbox = require("../models/Inbox");
const xpUtils = require("../utils/xp");
const leaderboardUtils = require("../utils/leaderboard");
const energyUtils = require("../utils/energy");


exports.grantRewardsToPlayer = async (playerId, rewards = []) => {
    const validRewards = []
    const rewardLabels = []

    for (const reward of rewards) {
        if (!reward || !reward.type) continue

        const rewardType = String(reward.type).toLowerCase().trim()
        const rewardAmount = Number(reward.amount) || 0

        if (rewardType === "exp" || rewardType === "leaderboard") {
            validRewards.push({ type: rewardType, amount: rewardAmount })
            rewardLabels.push({ name: rewardType === "exp" ? "EXP" : "Leaderboard Points", amount: rewardAmount })
            continue
        }

        if (rewardType === "energy" && !reward.itemid) {
            validRewards.push({ type: "energy", amount: rewardAmount })
            rewardLabels.push({ name: "Energy", amount: rewardAmount })
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

        const itemAmount = Math.max(1, rewardAmount || 1)
        validRewards.push({ type: inventoryType, amount: itemAmount, itemid: marketItem.itemid })
        rewardLabels.push({ name: marketItem.itemname || marketItem.itemid, amount: itemAmount })
    }

    if (validRewards.length === 0) return

    const itemLines = rewardLabels.map(r => `${r.name} x ${r.amount}`).join('\n')

    await Inbox.create({
        owner: new mongoose.Types.ObjectId(playerId),
        type: "reward",
        title: "You have rewards waiting!",
        description: `You have received ${itemLines} from admin!\n\nThank you for playing Rise of Fearless`,
        rewards: validRewards,
        status: "unopen"
    })
}

// Called when a player claims an inbox reward entry — applies the actual reward
exports.applyInboxRewards = async (playerId, rewards = []) => {
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

        if (inventoryType === "title") {
            const alreadyOwned = await Inventory.findOne({ owner: ownerId, itemid: reward.itemid })
            if (!alreadyOwned) {
                await Inventory.create([{
                    owner: ownerId,
                    itemid: marketItem.itemid,
                    itemname: marketItem.itemname,
                    type: inventoryType,
                    quantity: 1,
                    isEquipped: false
                }])
            }
            continue
        }

        const existingItem = await Inventory.findOne({ owner: ownerId, itemid: reward.itemid })
        if (existingItem) {
            await Inventory.findOneAndUpdate(
                { owner: ownerId, itemid: reward.itemid },
                { $inc: { quantity: itemQuantity } }
            )
            continue
        }

        await Inventory.create([{
            owner: ownerId,
            itemid: marketItem.itemid,
            itemname: marketItem.itemname,
            type: inventoryType,
            quantity: itemQuantity,
            isEquipped: false
        }])
    }
}