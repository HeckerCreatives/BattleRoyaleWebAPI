const { Titles, CharacterTitles } = require("../models/Titles");


exports.createtitle = async (req, res) => {

    const { index, name, description } = req.body;

    if (!index || !name || !description) {
        return res.status(400).json({ message: "bad-request", data: "All fields are required." });
    }

    const existingTitle = await Titles.findOne({
        index: index
    });
    if (existingTitle) {
        return res.status(400).json({ message: "bad-request", data: "Title with this index already exists." });
    }

    const existingName = await Titles.findOne({
        name: name
    });
    if (existingName) {
        return res.status(400).json({ message: "bad-request", data: "Title with this name already exists." });
    }

    const newTitle = new Titles({
        index,
        name,
        description
    });

    try {
        const savedTitle = await newTitle.save();
        return res.status(201).json({
            message: "success",
            data: savedTitle
        });
    } catch (err) {
        console.log(`Error creating title: ${err}`);
        return res.status(500).json({ message: "server-error", data: "There was an error creating the title." });
    }
}

exports.gettitles = async (req, res) => {
    const { page, limit, search } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10,
    }

    const query = {};
    if (search) {
        query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
    }
    const titles = await Titles.find(query)
        .skip(pageOptions.page * pageOptions.limit)
        .limit(pageOptions.limit)
        .sort({ index: 1 })
        .exec()
        .catch(err => {
            console.log(`Error fetching titles: ${err}`);
            return res.status(500).json({ message: "server-error", data: "There was an error fetching the titles." });
        });
    
    if (!titles || titles.length === 0) {
        return res.status(200).json({ message: "success", data: [], pagination: { totalCount: 0, totalPages: 0, currentPage: pageOptions.page, pageSize: pageOptions.limit } });
    }

    const totalCount = await Titles.countDocuments(query).catch(err => {
        console.log(`Error counting titles: ${err}`);
        return res.status(500).json({ message: "server-error", data: "There was an error counting the titles." });
    });

    const totalPages = Math.ceil(totalCount / pageOptions.limit);

    const formattedTitles = titles.map(title => ({
        id: title._id,
        index: title.index,
        name: title.name,
        description: title.description,
        createdAt: title.createdAt,
        updatedAt: title.updatedAt
    }));

    return res.status(200).json({
        message: "success",
        data: formattedTitles,
        pagination: {
            totalCount,
            totalPages,
            currentPage: pageOptions.page,
            pageSize: pageOptions.limit
        }
    });


}

exports.edittitle = async (req, res) => {
    const { id, index, name, description } = req.body;

    if (!id) {
        return res.status(400).json({ message: "bad-request", data: "Title ID is required." });
    }

    const updateData = {};
    if (index !== undefined) {
        const existingIndexTitle = await Titles.findOne({ index: index, _id: { $ne: id } });
        if (existingIndexTitle) {
            return res.status(400).json({ message: "bad-request", data: "Title with this index already exists." });
        }
    }
    if (name) {
        const existingNameTitle = await Titles.findOne({ name: name, _id: { $ne: id } });
        if (existingNameTitle) {
            return res.status(400).json({ message: "bad-request", data: "Title with this name already exists." });
        }
    }
    if (description) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "bad-request", data: "No fields to update." });
    }

    const updatedTitle = await Titles.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .catch(err => {
            console.log(`Error updating title: ${err}`);
            return res.status(500).json({ message: "server-error", data: "There was an error updating the title." });
        });

    if (!updatedTitle) {
        return res.status(404).json({ message: "not-found", data: "Title not found." });
    }

    return res.status(200).json({
        message: "success",
        data: updatedTitle
    });    
}

exports.deletetitle = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: "bad-request", data: "Title ID is required." });
    }

    const deletedTitle = await Titles.findByIdAndDelete(id)
        .catch(err => {
            console.log(`Error deleting title: ${err}`);
            return res.status(500).json({ message: "server-error", data: "There was an error deleting the title." });
        });

    if (!deletedTitle) {
        return res.status(404).json({ message: "not-found", data: "Title not found." });
    }

    await CharacterTitles.deleteMany({ title: id })
        .catch(err => {
            console.log(`Error deleting character titles: ${err}`);
            return res.status(500).json({ message: "server-error", data: "There was an error deleting character titles." });
        });


    return res.status(200).json({
        message: "success",
    });
}