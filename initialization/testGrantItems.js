/**
 * ITEM GRANTING UTILITY - TEST SCRIPT
 * 
 * This script demonstrates how to use the grantItems utility
 * Run this file directly or import the functions in your code
 */

const mongoose = require("mongoose");
require("dotenv").config();

const {
    grantItems,
    grantAllItems,
    grantItemsByType,
    removeItems,
    clearInventory,
    getInventory
} = require("./grantItems");

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("✓ Database connected");
    } catch (error) {
        console.error("✗ Database connection failed:", error);
        process.exit(1);
    }
};

// Example usage functions
const examples = {
    // Example 1: Grant specific items to a player
    async grantSpecificItems() {
        console.log("\n--- Example 1: Grant Specific Items ---");
        
        const result = await grantItems("wallet_0xD998E302", [
            { itemid: "ENG-001", quantity: 5 },
            { itemid: "ENG-003", quantity: 3 },
            { itemid: "XPPOT-001", quantity: 2 }
        ], {
            isMintable: true, // These items can be minted as NFTs
            reason: "welcome_bonus"
        });

        console.log(result);
    },

    // Example 2: Grant all marketplace items
    async grantAllMarketItems() {
        console.log("\n--- Example 2: Grant All Items ---");
        
        const result = await grantAllItems("nappy1", 1); // 10 of each item
        console.log(result);
    },

    // Example 3: Grant items by type
    async grantByType() {
        console.log("\n--- Example 3: Grant Items by Type ---");
        
        // Grant all energy potions
        const result = await grantItemsByType("wallet_0xD998E302", "energy", 5);
        console.log(result);
    },

    // Example 4: Remove items from inventory
    async removeFromInventory() {
        console.log("\n--- Example 4: Remove Items ---");
        
        const result = await removeItems("wallet_0xD998E302", [
            { itemid: "ENG-001", quantity: 2 }
        ]);
        console.log(result);
    },

    // Example 5: View player inventory
    async viewInventory() {
        console.log("\n--- Example 5: View Inventory ---");
        
        const result = await getInventory("wallet_0xD998E302");
        console.log(result);
    },

    // Example 6: Clear entire inventory
    async clearPlayerInventory() {
        console.log("\n--- Example 6: Clear Inventory ---");
        
        const result = await clearInventory("wallet_0xD998E302");
        console.log(result);
    }
};

// Main execution
const runExamples = async () => {
    await connectDB();

    try {
        // Uncomment the examples you want to run:

        // await examples.grantSpecificItems();
        await examples.grantAllMarketItems();
        // await examples.grantByType();
        // await examples.viewInventory();
        // await examples.removeFromInventory();
        // await examples.clearPlayerInventory();

        console.log("\n✓ All operations completed");

    } catch (error) {
        console.error("Error running examples:", error);
    } finally {
        await mongoose.connection.close();
        console.log("✓ Database connection closed");
    }
};

// Run if executed directly
if (require.main === module) {
    console.log("=== Item Granting Utility Test ===");
    console.log("Uncomment the examples you want to run in runExamples()");
    runExamples();
}

// Export for use in other files
module.exports = examples;
