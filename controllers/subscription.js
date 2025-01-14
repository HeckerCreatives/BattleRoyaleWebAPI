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
