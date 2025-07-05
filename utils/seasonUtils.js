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

// Auto-update season statuses based on time
const updateSeasonStatuses = async () => {
    try {
        const now = new Date();
        
        // Find seasons that should be active but aren't marked as active
        const upcomingSeasons = await Season.find({ status: "upcoming", startedAt: { $lte: now } });
        
        for (const season of upcomingSeasons) {
            const timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);
            if (timeInfo && !timeInfo.hasEnded) {
                await Season.findByIdAndUpdate(season._id, { status: "active" });
            } else if (timeInfo && timeInfo.hasEnded) {
                await Season.findByIdAndUpdate(season._id, { status: "ended" });
            }
        }
        
        // Find active seasons that should be ended
        const activeSeasons = await Season.find({ status: "active" });
        
        for (const season of activeSeasons) {
            const timeInfo = getTimeUntilSeasonEnd(season.startedAt, season.duration);
            if (timeInfo && timeInfo.hasEnded) {
                await Season.findByIdAndUpdate(season._id, { status: "ended" });
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
    updateSeasonStatuses
};
