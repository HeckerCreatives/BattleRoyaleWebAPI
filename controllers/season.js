const { default: mongoose } = require("mongoose");
const Season = require("../models/Season");
const { getTimeUntilSeasonEnd, transitionFromEndedSeason, updateSeasonStatuses } = require("../utils/seasonUtils");

exports.createseason = async (req, res) => {
    try {
        const { title, duration, status, startedAt } = req.body;

        if (!title || !duration ||  !status) {
            return res.status(400).json({
                message: "bad-request",
                data: "Title and duration are required."
            });
        }

        if (duration <= 0) {
            return res.status(400).json({
                message: "bad-request",
                data: "Duration must be a positive number of days."
            });
        }

        // Check if trying to create an active season when one already exists
        if (status === "active") {
            const activeSeason = await Season.findOne({ status: "active" });
            if (activeSeason) {
                return res.status(400).json({
                    message: "bad-request",
                    data: "There is already an active season. End it before creating a new active season."
                });
            }
        }

        const seasonData = {
            title,
            duration,
            status: status
        };

        if (startedAt) {
            seasonData.startedAt = new Date(startedAt);
        }

        const newSeason = await Season.create(seasonData);

        // Calculate end time if season is active
        let timeInfo = null;
        if (newSeason.startedAt) {
            timeInfo = getTimeUntilSeasonEnd(newSeason.startedAt, newSeason.duration);
        }

        return res.json({
            message: "success",
            data: {
                season: newSeason,
                timeInfo: timeInfo
            }
        });

    } catch (error) {
        console.log(`Error creating season: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem creating the season. Please contact customer support."
        });
    }
};

exports.getallseasons = async (req, res) => {
    try {
        // Update statuses before fetching
        await updateSeasonStatuses();

        const seasons = await Season.find()
            .sort({ createdAt: -1 })
            .then(data => data)
            .catch(err => {
                console.log(`Error getting seasons: ${err}`);
                return [];
            });

        // Add time information for each season
        const seasonsWithTimeInfo = seasons.map(season => {
            let timeInfo = null;
            if (season.startedAt && season.duration) {
                timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);
            }

            return {
                ...season.toObject(),
                timeInfo: timeInfo
            };
        });

        return res.json({
            message: "success",
            data: {
                seasons: seasonsWithTimeInfo,
                totalSeasons: seasonsWithTimeInfo.length
            }
        });

    } catch (error) {
        console.log(`Error getting all seasons: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem getting seasons. Please contact customer support."
        });
    }
};

exports.getcurrentseason = async (req, res) => {
    try {
        // Update statuses before fetching
        await updateSeasonStatuses();

        const currentSeason = await Season.findOne({ status: "active" })
            .then(data => data)
            .catch(err => {
                console.log(`Error getting current season: ${err}`);
                return null;
            });

        if (!currentSeason) {
            return res.json({
                message: "success",
                data: {
                    season: null,
                    message: "No active season found."
                }
            });
        }

        // Calculate time information
        const timeInfo = getTimeUntilSeasonEnd(currentSeason.startedAt, currentSeason.duration);

        return res.json({
            message: "success",
            data: {
                season: currentSeason,
                timeInfo: timeInfo
            }
        });

    } catch (error) {
        console.log(`Error getting current season: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem getting the current season. Please contact customer support."
        });
    }
};

exports.startseason = async (req, res) => {
    try {
        const { seasonId } = req.body;

        if (!seasonId) {
            return res.status(400).json({
                message: "bad-request",
                data: "Season ID is required."
            });
        }

        // Check if there's already an active season
        const activeSeason = await Season.findOne({ status: "active" });
        if (activeSeason) {
            return res.status(400).json({
                message: "bad-request",
                data: "There is already an active season. End it before starting a new one."
            });
        }

        // Find and start the season
        const season = await Season.findByIdAndUpdate(
            seasonId,
            {
                status: "active",
                startedAt: new Date()
            },
            { new: true }
        );

        if (!season) {
            return res.status(404).json({
                message: "not-found",
                data: "Season not found."
            });
        }

        // Calculate time information
        const timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);

        return res.json({
            message: "success",
            data: {
                season: season,
                timeInfo: timeInfo
            }
        });

    } catch (error) {
        console.log(`Error starting season: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem starting the season. Please contact customer support."
        });
    }
};

exports.endseason = async (req, res) => {
    try {
        const { seasonId } = req.body;

        if (!seasonId) {
            return res.status(400).json({
                message: "bad-request",
                data: "Season ID is required."
            });
        }

        const existingSeason = await Season.findById(seasonId);

        if (!existingSeason) {
            return res.status(404).json({
                message: "not-found",
                data: "Season not found."
            });
        }

        if (existingSeason.status !== "active") {
            return res.status(400).json({
                message: "bad-request",
                data: "Only an active season can be ended manually."
            });
        }

        // Find and end the season
        const season = await Season.findByIdAndUpdate(
            seasonId,
            { status: "ended" },
            { new: true }
        );

        if (!season) {
            return res.status(404).json({
                message: "not-found",
                data: "Season not found."
            });
        }

        const transitionResult = await transitionFromEndedSeason(season);

        let nextSeasonTimeInfo = null;
        if (transitionResult && transitionResult.activatedSeason) {
            nextSeasonTimeInfo = getTimeUntilSeasonEnd(
                transitionResult.activatedSeason.startedAt,
                transitionResult.activatedSeason.duration
            );
        }

        // Calculate final time information
        const timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);

        return res.json({
            message: "success",
            data: {
                season: season,
                timeInfo: timeInfo,
                transition: transitionResult,
                nextSeasonTimeInfo: nextSeasonTimeInfo
            }
        });

    } catch (error) {
        console.log(`Error ending season: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem ending the season. Please contact customer support."
        });
    }
};

exports.updateseason = async (req, res) => {
    try {
        const { seasonId, title, duration, status } = req.body;

        if (!seasonId) {
            return res.status(400).json({
                message: "bad-request",
                data: "Season ID is required."
            });
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (duration && duration > 0) updateData.duration = duration;
        if (status) {
            if (!["active", "upcoming", "ended"].includes(status)) {
                return res.status(400).json({
                    message: "bad-request",
                    data: "Invalid status. Must be 'active', 'upcoming', or 'ended'."
                });
            }
            
            // Check if trying to set status to active when another season is already active
            if (status === "active") {
                const activeSeason = await Season.findOne({ status: "active" });
                if (activeSeason && activeSeason._id.toString() !== seasonId) {
                    return res.status(400).json({
                        message: "bad-request",
                        data: "There is already an active season. End it before setting another season to active."
                    });
                }
            }
            
            updateData.status = status;
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "bad-request",
                data: "At least one field (title or duration) must be provided for update."
            });
        }

        const season = await Season.findByIdAndUpdate(
            seasonId,
            updateData,
            { new: true }
        );

        if (!season) {
            return res.status(404).json({
                message: "not-found",
                data: "Season not found."
            });
        }

        // Calculate time information if season is active
        let timeInfo = null;
        if (season.startedAt && season.duration) {
            timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);
        }

        return res.json({
            message: "success",
            data: {
                season: season,
                timeInfo: timeInfo
            }
        });

    } catch (error) {
        console.log(`Error updating season: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem updating the season. Please contact customer support."
        });
    }
};

exports.getseasonsuperadmin = async (req, res) => {
    try {
        // Update statuses before fetching
        await updateSeasonStatuses();

        const seasons = await Season.find()
            .sort({ createdAt: -1 })
            .then(data => data)
            .catch(err => {
                console.log(`Error getting seasons for super admin: ${err}`);
                return [];
            });

        // Add time information for each season
        const seasonsWithTimeInfo = seasons.map(season => {
            let timeInfo = null;
            if (season.startedAt && season.duration) {
                timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);
            }

            return {
                ...season.toObject(),
                timeInfo: timeInfo
            };
        });

        return res.json({
            message: "success",
            data: {
                seasons: seasonsWithTimeInfo,
                totalSeasons: seasonsWithTimeInfo.length
            }
        });

    } catch (error) {
        console.log(`Error getting seasons for super admin: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem getting seasons. Please contact customer support."
        });
    }
};

exports.deleteseason = async (req, res) => {
    try {
        const { seasonId } = req.body;

        if (!seasonId) {
            return res.status(400).json({
                message: "bad-request",
                data: "Season ID is required."
            });
        }

        const season = await Season.findById(seasonId);
        if (!season) {
            return res.status(404).json({
                message: "not-found",
                data: "Season not found."
            });
        }

        if (season.status === "active") {
            return res.status(400).json({
                message: "bad-request",
                data: "Cannot delete an active season. End it first."
            });
        }

        await Season.findByIdAndDelete(seasonId);

        return res.json({
            message: "success",
            data: "Season deleted successfully."
        });

    } catch (error) {
        console.log(`Error deleting season: ${error}`);
        return res.status(500).json({
            message: "error",
            data: "There was a problem deleting the season. Please contact customer support."
        });
    }
};
