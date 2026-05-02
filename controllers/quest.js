const { Quest, QuestProgresses } = require("../models/Quest");
const Ads = require("../models/Ads");
const mongoose = require("mongoose");

const VALID_QUEST_TYPES = ["MATCH", "WIN", "KILL", "USE_ITEM", "WATCH_ADS"];
const VALID_REWARD_TYPES = ["exp", "leaderboard", "energy", "potion", "title", "item"];
const MAX_REWARDS = 5;

// ─── Quest CRUD ───────────────────────────────────────────────────────────────

exports.getallquests = async (req, res) => {
    try {
        const quests = await Quest.find({});
        return res.status(200).json({ message: "success", data: quests });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.getquest = async (req, res) => {
    try {
        const { questid, id } = req.query;
        const query = id ? { _id: id } : questid ? { questid } : {};

        if (!id && !questid) {
            return res.status(400).json({ message: "bad-request", data: "questid or id is required." });
        }

        const quest = await Quest.findOne(query);
        if (!quest) return res.status(404).json({ message: "failed", data: "Quest not found." });
        return res.status(200).json({ message: "success", data: quest });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.createquest = async (req, res) => {
    try {
        const { questid, title, description, type, target, rewards, isSkippable, isActive } = req.body;

        if (!questid || !title || !type || target == null) {
            return res.status(400).json({ message: "bad-request", data: "questid, title, type, and target are required." });
        }

        const totalQuests = await Quest.countDocuments();

        if (totalQuests >= 8) {
            return res.status(400).json({ message: "bad-request", data: "Maximum number of quests (8) has been reached." });
        }

        if (!VALID_QUEST_TYPES.includes(type)) {
            return res.status(400).json({ message: "bad-request", data: `type must be one of: ${VALID_QUEST_TYPES.join(", ")}.` });
        }

        const rewardList = rewards || [];
        if (rewardList.length > MAX_REWARDS) {
            return res.status(400).json({ message: "bad-request", data: `A quest can have at most ${MAX_REWARDS} rewards.` });
        }

        for (const reward of rewardList) {
            if (!VALID_REWARD_TYPES.includes(reward.type)) {
                return res.status(400).json({ message: "bad-request", data: `Invalid reward type "${reward.type}". Must be one of: ${VALID_REWARD_TYPES.join(", ")}.` });
            }
        }
        

        const existing = await Quest.findOne({ questid });
        if (existing) {
            return res.status(400).json({ message: "bad-request", data: `Quest with questid "${questid}" already exists.` });
        }

        const quest = await Quest.create({ questid, title, description, type, target, rewards: rewardList, isSkippable, isActive });
        return res.status(201).json({ message: "success", data: quest });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.updatequest = async (req, res) => {
    try {
        const { id, questid, title, description, type, target, rewards, isSkippable, isActive } = req.body;

        if (!id && !questid) {
            return res.status(400).json({ message: "bad-request", data: "id or questid is required." });
        }

        if (type && !VALID_QUEST_TYPES.includes(type)) {
            return res.status(400).json({ message: "bad-request", data: `type must be one of: ${VALID_QUEST_TYPES.join(", ")}.` });
        }

        if (rewards !== undefined) {
            if (!Array.isArray(rewards)) {
                return res.status(400).json({ message: "bad-request", data: "rewards must be an array." });
            }
            if (rewards.length > MAX_REWARDS) {
                return res.status(400).json({ message: "bad-request", data: `A quest can have at most ${MAX_REWARDS} rewards.` });
            }
            for (const reward of rewards) {
                if (!VALID_REWARD_TYPES.includes(reward.type)) {
                    return res.status(400).json({ message: "bad-request", data: `Invalid reward type "${reward.type}". Must be one of: ${VALID_REWARD_TYPES.join(", ")}.` });
                }
            }
        }

        const query = id ? { _id: id } : { questid };

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (type !== undefined) updates.type = type;
        if (target !== undefined) updates.target = target;
        if (rewards !== undefined) updates.rewards = rewards;
        if (isSkippable !== undefined) updates.isSkippable = isSkippable;
        if (isActive !== undefined) updates.isActive = isActive;

        const quest = await Quest.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: true });
        if (!quest) return res.status(404).json({ message: "failed", data: "Quest not found." });

        return res.status(200).json({ message: "success", data: quest });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.deletequest = async (req, res) => {
    try {
        const { id, questid } = req.body;

        if (!id && !questid) {
            return res.status(400).json({ message: "bad-request", data: "id or questid is required." });
        }

        const query = id ? { _id: id } : { questid };
        const quest = await Quest.findOneAndDelete(query);
        if (!quest) return res.status(404).json({ message: "failed", data: "Quest not found." });

        await QuestProgresses.deleteMany({ quest: quest._id });

        return res.status(200).json({ message: "success", data: "Quest and all associated progress records have been deleted." });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

// ─── Quest Rewards CRUD ───────────────────────────────────────────────────────

exports.addreward = async (req, res) => {
    try {
        const { id, questid, type, amount, itemid } = req.body;

        if (!id && !questid) {
            return res.status(400).json({ message: "bad-request", data: "id or questid is required." });
        }

        const query = id ? { _id: id } : { questid };
        const quest = await Quest.findOne(query);
        if (!quest) return res.status(404).json({ message: "failed", data: "Quest not found." });

        if (quest.rewards.length >= MAX_REWARDS) {
            return res.status(400).json({ message: "bad-request", data: `A quest can have at most ${MAX_REWARDS} rewards.` });
        }

        if (!type) return res.status(400).json({ message: "bad-request", data: "Reward type is required." });

        if (!VALID_REWARD_TYPES.includes(type)) {
            return res.status(400).json({ message: "bad-request", data: `Invalid reward type "${type}". Must be one of: ${VALID_REWARD_TYPES.join(", ")}.` });
        }

        const newReward = { type, amount: amount ?? 0 };
        if (itemid) newReward.itemid = itemid;

        quest.rewards.push(newReward);
        await quest.save();

        return res.status(201).json({ message: "success", data: quest });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.updatereward = async (req, res) => {
    try {
        const { id, questid, rewardId, type, amount, itemid } = req.body;

        if (!id && !questid) {
            return res.status(400).json({ message: "bad-request", data: "id or questid is required." });
        }

        if (!rewardId) {
            return res.status(400).json({ message: "bad-request", data: "rewardId is required." });
        }

        if (type && !VALID_REWARD_TYPES.includes(type)) {
            return res.status(400).json({ message: "bad-request", data: `Invalid reward type "${type}". Must be one of: ${VALID_REWARD_TYPES.join(", ")}.` });
        }

        const query = id ? { _id: id } : { questid };

        const setFields = {};
        if (type !== undefined) setFields["rewards.$[elem].type"] = type;
        if (amount !== undefined) setFields["rewards.$[elem].amount"] = amount;
        if (itemid !== undefined) setFields["rewards.$[elem].itemid"] = itemid;

        const quest = await Quest.findOneAndUpdate(
            query,
            { $set: setFields },
            {
                new: true,
                runValidators: true,
                arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(rewardId) }]
            }
        );

        if (!quest) return res.status(404).json({ message: "failed", data: "Quest not found." });

        const updated = quest.rewards.find(r => r._id.toString() === rewardId);
        if (!updated) return res.status(404).json({ message: "failed", data: "Reward not found." });

        return res.status(200).json({ message: "success", data: quest });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.deletereward = async (req, res) => {
    try {
        const { id, questid, rewardId } = req.body;

        if (!id && !questid) {
            return res.status(400).json({ message: "bad-request", data: "id or questid is required." });
        }

        if (!rewardId) {
            return res.status(400).json({ message: "bad-request", data: "rewardId is required." });
        }

        const query = id ? { _id: id } : { questid };

        const quest = await Quest.findOneAndUpdate(
            query,
            { $pull: { rewards: { _id: new mongoose.Types.ObjectId(rewardId) } } },
            { new: true }
        );

        if (!quest) return res.status(404).json({ message: "failed", data: "Quest not found." });

        return res.status(200).json({ message: "success", data: quest });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

// ─── Admin Resets ─────────────────────────────────────────────────────────────

exports.resetallquestprogress = async (req, res) => {
    try {
        const result = await QuestProgresses.updateMany(
            {},
            { $set: { progress: 0, isCompleted: false, isClaimed: false, isSkipped: false } }
        );
        return res.status(200).json({ message: "success", data: `${result.modifiedCount} quest progress record(s) reset.` });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};

exports.resetplayerads = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "bad-request", data: "userId is required." });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "bad-request", data: "Invalid userId." });
        }

        const result = await Ads.deleteMany({ owner: new mongoose.Types.ObjectId(userId) });
        return res.status(200).json({ message: "success", data: `${result.deletedCount} ads record(s) deleted for player.` });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};


exports.resetallwatchads = async (req, res) => {
    try {
        const result = await Ads.updateMany(
            { $set: { isClaimed: false } }
        );
        return res.status(200).json({ message: "success", data: `${result.modifiedCount} WATCH_ADS record(s) reset.` });
    } catch (ex) {
        return res.status(500).json({ message: "failed", data: ex.message });
    }
};