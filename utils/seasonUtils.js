const Season = require("../models/Season");

// Utility function to calculate season end time
const calculateSeasonEndTime = (startedAt, duration) => {
    if (!startedAt || !duration) return null;
    
    const startDate = new Date(startedAt);
    const durationMs = duration * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const endDate = new Date(startDate.getTime() + durationMs);
    
    return endDate;
};

// Utility function to get time remaining until season ends
const getTimeUntilSeasonEnd = (startedAt, duration) => {
    const endTime = calculateSeasonEndTime(startedAt, duration);
    if (!endTime) return null;
    
    const now = new Date();
    const timeRemaining = endTime.getTime() - now.getTime();
    
    return {
        endTime: endTime,
        millisecondsRemaining: Math.max(0, timeRemaining),
        daysRemaining: Math.max(0, Math.ceil(timeRemaining / (24 * 60 * 60 * 1000))),
        hoursRemaining: Math.max(0, Math.ceil(timeRemaining / (60 * 60 * 1000))),
        minutesRemaining: Math.max(0, Math.ceil(timeRemaining / (60 * 1000))),
        hasEnded: timeRemaining <= 0
    };
};

const buildNextSeasonTitle = async (endedSeasonTitle) => {
    const titleMatch = endedSeasonTitle && endedSeasonTitle.match(/(\d+)(?!.*\d)/);

    if (titleMatch) {
        const nextSeasonNumber = parseInt(titleMatch[1], 10) + 1;
        return `Season ${nextSeasonNumber}`;
    }

    const seasonCount = await Season.countDocuments();
    return `Season ${seasonCount + 1}`;
};

const transitionFromEndedSeason = async (endedSeason) => {
    if (!endedSeason || !endedSeason._id) {
        return null;
    }

    const alreadyActive = await Season.findOne({
        status: "active",
        _id: { $ne: endedSeason._id }
    });

    if (alreadyActive) {
        return {
            transitionType: "already-active",
            endedSeasonId: endedSeason._id,
            activatedSeason: alreadyActive
        };
    }

    const nextUpcomingSeason = await Season.findOne({ status: "upcoming" })
        .sort({ createdAt: 1 });

    const now = new Date();

    if (nextUpcomingSeason) {
        await Season.updateMany(
            {
                status: "active",
                _id: { $ne: endedSeason._id }
            },
            { status: "ended" }
        );

        const activatedSeason = await Season.findByIdAndUpdate(
            nextUpcomingSeason._id,
            {
                status: "active",
                startedAt: now
            },
            { new: true }
        );

        return {
            transitionType: "activated-existing",
            endedSeasonId: endedSeason._id,
            activatedSeason: activatedSeason
        };
    }

    const seasonDuration = endedSeason.duration && endedSeason.duration > 0 ? endedSeason.duration : 1;
    const seasonTitle = await buildNextSeasonTitle(endedSeason.title);

    const createdSeason = await Season.create({
        title: seasonTitle,
        duration: seasonDuration,
        status: "active",
        startedAt: now
    });

    return {
        transitionType: "created-and-activated",
        endedSeasonId: endedSeason._id,
        activatedSeason: createdSeason
    };
};

// Auto-update season statuses based on time
const updateSeasonStatuses = async () => {
    try {
        const now = new Date();

        // Find active seasons that should be ended
        const activeSeasons = await Season.find({ status: "active" });

        for (const season of activeSeasons) {
            const timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);
            if (timeInfo && timeInfo.hasEnded) {
                const endedSeason = await Season.findByIdAndUpdate(
                    season._id,
                    { status: "ended" },
                    { new: true }
                );

                await transitionFromEndedSeason(endedSeason);
            }
        }

        // Find seasons that should be active but aren't marked as active
        const upcomingSeasons = await Season.find({ status: "upcoming", startedAt: { $lte: now } })
            .sort({ createdAt: 1 });

        for (const season of upcomingSeasons) {
            const timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);

            if (timeInfo && timeInfo.hasEnded) {
                const endedSeason = await Season.findByIdAndUpdate(
                    season._id,
                    { status: "ended" },
                    { new: true }
                );

                await transitionFromEndedSeason(endedSeason);
                continue;
            }

            if (timeInfo && !timeInfo.hasEnded) {
                const hasActiveSeason = await Season.findOne({ status: "active" });
                if (!hasActiveSeason) {
                    await Season.findByIdAndUpdate(season._id, { status: "active" });
                }
            }
        }

        console.log("Season statuses updated successfully");
    } catch (error) {
        console.log(`Error updating season statuses: ${error}`);
    }
};

module.exports = {
    calculateSeasonEndTime,
    getTimeUntilSeasonEnd,
    transitionFromEndedSeason,
    updateSeasonStatuses
};
