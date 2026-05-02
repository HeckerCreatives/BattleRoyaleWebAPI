const { default: mongoose } = require("mongoose");
const Inventory = require("../models/Inventory");
const Marketplace = require("../models/Marketplace");
const xpUtils = require("../utils/xp");
const leaderboardUtils = require("../utils/leaderboard");
const energyUtils = require("../utils/energy");


exports.grantRewardsToPlayer = async (playerId, rewards = []) => {
    const ownerId = new mongoose.Types.ObjectId(playerId)

    for (const reward of rewards) {
        if (!reward || !reward.type) continue

        if (reward.type === "exp") {
            await xpUtils.addXP(playerId, reward.amount || 0)
            continue
        }

        if (reward.type === "leaderboard") {
            await leaderboardUtils.addPoints(playerId, reward.amount || 0)
            continue
        }

        if (reward.type === "energy") {
            await energyUtils.updateEnergy(playerId, reward.amount || 0)
            continue
        }

        if (reward.type !== "potion" && reward.type !== "title") {
            continue
        }

        if (!reward.itemid) continue

        const marketItem = await Marketplace.findOne({ itemid: reward.itemid })
        if (!marketItem) continue

        if (reward.type === "title") {
            const alreadyOwned = await Inventory.findOne({
                owner: ownerId,
                itemid: reward.itemid
            })

            if (!alreadyOwned) {
                await Inventory.create([{
                    owner: ownerId,
                    itemid: marketItem.itemid,
                    itemname: marketItem.itemname,
                    type: "title",
                    quantity: 1,
                    isEquipped: false
                }])
            }

            continue
        }

        const existingItem = await Inventory.findOne({
            owner: ownerId,
            itemid: reward.itemid
        })

        if (existingItem) {
            await Inventory.findOneAndUpdate(
                { owner: ownerId, itemid: reward.itemid },
                { $inc: { quantity: reward.amount || 1 } }
            )
            continue
        }

        await Inventory.create([{
            owner: ownerId,
            itemid: marketItem.itemid,
            itemname: marketItem.itemname,
            type: "potion",
            quantity: reward.amount || 1,
            isEquipped: false
        }])
    }
}