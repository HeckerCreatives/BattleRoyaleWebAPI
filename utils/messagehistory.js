const mongoose = require("mongoose");
const Inbox = require("../models/Inbox");

/**
 * Send a mail with optional rewards to one or multiple users.
 * Creates an Inbox entry (status "unopen") per recipient.
 *
 * @param {Object} opts
 * @param {string|string[]} opts.userIds - one or many Users _id
 * @param {string}        opts.title
 * @param {string}        opts.message
 * @param {Array}         opts.rewards   - [{ type, amount, itemid? }]
 */
exports.sendMailWithRewards = async ({ userIds, title, message, rewards = [] }) => {
    const recipients = Array.isArray(userIds) ? userIds : [userIds];

    const inboxDocs = recipients.map(userId => ({
        owner: new mongoose.Types.ObjectId(userId),
        type: "mail",
        title,
        description: message,
        rewards,
        status: "unopen"
    }));

    await Inbox.insertMany(inboxDocs);
};
