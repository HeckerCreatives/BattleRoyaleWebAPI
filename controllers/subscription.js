const { default: mongoose } = require("mongoose");
const Subscription = require("../models/Subscription");

exports.Subscribe = async (req, res) => {
    const { email } = req.body

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if(!emailRegex.test(email)){
        return res.status(400).json({ message: "failed",  data: "Please input a valid email."})
    }

    const isExisting = await Subscription.findOne({
        email: { $regex: `^${email}$`, $options: "i" } 
    });

    if (isExisting) {
        return res.status(400).json({ message: "failed", data: "Email already subscribed!" });
    }
    await Subscription.create({
        email: email
    })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating newsletter subscription. Error: ${err}`)
        return res.status(400).json({ message: "failed", data: "There's a problem with the server! Please contact customer support for more details."})
    })

    return res.status(200).json({ message: "success" })
}

exports.Unsubscribe = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "failed", data: "Email is required." });
    }

    const subscriber = await Subscription.findOne({ email: email });

    if (!subscriber) {
        return res.status(404).json({ message: "failed", data: "Email not found in subscription list." });
    }

    await Subscription.deleteOne({ email: email })
        .then(() => {
            return res.status(200).json({ message: "success", data: "You have successfully unsubscribed." });
        })
        .catch((err) => {
            console.log(`Error while unsubscribing. Error: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
        });
};

exports.getSubscribers = async (req, res) => {
    const subscribers = await Subscription.find()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching subscribers. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })
    const data = []
    subscribers.forEach(temp => {
        data.push({
            email: temp.email
        })
    })

    return res.status(200).json({ message: "success", data: data})
}


exports.getSubscriberlist = async (req, res) => {
    const { page, limit, search } = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    const aggregationpipeline = [
        ...(search ? [{ $match: { email: { $regex: search, $options: "i" } } }] : []),
        {
            $skip: pageOptions.page * pageOptions.limit,
        },
        {
            $limit: pageOptions.limit,
        },
    ]

    const subscribersdata = await Subscription.aggregate(aggregationpipeline)
    .catch(err => {
        console.log(`There's a problem encountered while fetching subscription list. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const totalpages = await Subscription.countDocuments(aggregationpipeline)
    .catch(err => {
        console.log(`There's a problem encountered while counting subscription list. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })
    
    const finalpages = Math.ceil(totalpages / pageOptions.limit);

    const finaldata = {
        totalpages: finalpages,
        data: subscribersdata
    }

    return res.status(200).json({ message: "success", data: finaldata})
    
}

exports.DeleteSubscribersByIds = async (req, res) => {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
            message: "failed",
            data: "User IDs are required and must be provided as an array.",
        });
    }

    const ids = userIds.map(id => new mongoose.Types.ObjectId(id));

    await Subscription.deleteMany({ _id: { $in: ids } })
        .then(deletionResult => {
            if (deletionResult.deletedCount === 0) {
                return res.status(404).json({
                    message: "failed",
                    data: "No subscribers found for the provided IDs.",
                });
            }

            return res.status(200).json({
                message: "success",
                data: `Successfully deleted ${deletionResult.deletedCount} subscriber(s).`,
            });
        })
        .catch(err => {
            console.error(`Error while deleting subscribers. Error: ${err}`);
            return res.status(500).json({
                message: "bad-request",
                data: "There's a problem with the server. Please contact support for more details.",
            });
        });
};
