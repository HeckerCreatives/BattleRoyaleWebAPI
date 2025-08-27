const Version = require("../models/Version");
const {pushnotificationsend} = require("../utils/onesignal")


exports.getActiveVersion = async (req, res) => {
    let data = await Version.findOne({ isActive: true })
        .sort({ releaseDate: -1 })
        .exec()
        .catch(err => {
            console.log(`Error fetching active version: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    if (!data) {
        data = await Version.create({
            version: "1.0.0",
            description: "Initial version of the game",
            releaseDate: new Date(),
            isActive: true
        }).catch(err => {
            console.log(`Error creating initial version: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });
        console.log("No active version found, created initial version.");
    }

    return res.status(200).json({
        message: "success",
        data: {
            id: data._id,
            version: data.version,
            description: data.description,
            releaseDate: data.releaseDate,
            isActive: data.isActive
        }
    });
}

exports.editversion = async (req, res) => {
    const { id, version, description, isActive } = req.body;

    if( !id) {
        return res.status(400).json({ message: "bad-request", data: "Version ID is required." });
    }
    const updateData =  { }

    if (version) updateData.version = version;
    if (description) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "bad-request", data: "No fields to update." });
    }
    const updatedVersion = await Version.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    )
    .catch(err => {
        console.log(`Error updating version: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
    });

    if (!updatedVersion) {
        return res.status(404).json({ message: "not-found", data: "Version not found." });
    }

    pushnotificationsend(process.env.ONE_SIGNAL_NEW_VERSION_TEMPLATE_ID)

    return res.status(200).json({
        message: "success",
    });
}


