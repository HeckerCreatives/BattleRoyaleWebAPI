const mongoose = require("mongoose")

// Counter schema for auto-incrementing tokenId
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

const inventorySchema = new mongoose.Schema(
    {
        // Unique token ID for NFT minting (auto-incremented)
        tokenId: {
            type: Number,
            unique: true,
            required: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        // reference to marketplace item (optional)
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Marketplace",
            required: false
        },
        // denormalized fields for easier reads (keeps compatibility)
        itemid: {
            type: String,
            required: false
        },
        itemname: {
            type: String,
            required: false
        },
        type: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            default: 1
        },
        isEquipped: {
            type: Boolean,
            default: false
        },
        ipfsImage: {
            type: String
        },
        isMintable: {
            type: Boolean,
            default: false
        },
        // NFT Minting Status
        isMinted: {
            type: Boolean,
            default: false
        },
        nftData: {
            tokenId: String,                    // Blockchain token ID from MyNFT contract
            nftContractAddress: String,         // MyNFT contract address
            marketplaceContractAddress: String, // NFTMarketplace contract address
            tokenStandard: String,              // ERC721
            chainId: Number,                    // 1 = Ethereum, 137 = Polygon, etc.
            mintTransactionHash: String,        // Minting transaction hash
            mintedAt: Date,                     // When it was minted
            metadataUri: String                 // Off-chain metadata URI (IPFS)
        },
        // Marketplace Listing Status
        isListed: {
            type: Boolean,
            default: false
        },
        listingData: {
            price: String,              // Listing price in wei
            listedAt: Date,
            listTransactionHash: String,
            seller: String              // Wallet address
        },
        // Transfer/Trade tracking
        isTransferable: {
            type: Boolean,
            default: true   // Some items might be soulbound
        },
        transferHistory: [{
            from: String,       // wallet address or "system"
            to: String,         // wallet address or "marketplace"
            txHash: String,     // blockchain transaction hash
            action: String,     // "mint", "transfer", "list", "buy", "cancel", "burn"
            timestamp: Date
        }]
    },
    {
        timestamps: true,
    }
)

// Static method to generate next tokenId
inventorySchema.statics.getNextTokenId = async function() {
    const counter = await Counter.findByIdAndUpdate(
        { _id: 'inventoryTokenId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

// Static method to create inventory with auto-incremented tokenId
inventorySchema.statics.createWithTokenId = async function(data) {
    const tokenId = await this.getNextTokenId();
    return await this.create({ ...data, tokenId });
};

const Inventory = mongoose.model("Inventory", inventorySchema)

module.exports = Inventory