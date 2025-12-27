const mongoose = require("mongoose")

// Counter schema for auto-incrementing tokenId
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

const inventorySchema = new mongoose.Schema(
    {
        // Token ID for items (auto-incremented, mintable: 0-999999, non-mintable: 1000000+)
        tokenId: {
            type: Number,
            required: false,
            index: true
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

// Static method to generate next tokenId for mintable NFTs (0-999999)
inventorySchema.statics.getNextTokenId = async function() {
    const counter = await Counter.findByIdAndUpdate(
        { _id: 'inventoryTokenId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

// Static method to generate next tokenId for non-mintable items (1000000+)
inventorySchema.statics.getNextNonMintableTokenId = async function() {
    const counter = await Counter.findByIdAndUpdate(
        { _id: 'nonMintableTokenId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    // Start at 1,000,000 if this is the first non-mintable item
    const tokenId = counter.seq < 1000000 ? 1000000 : counter.seq;
    
    // Update to 1,000,000 if it was less
    if (counter.seq < 1000000) {
        await Counter.findByIdAndUpdate(
            { _id: 'nonMintableTokenId' },
            { seq: 1000000 }
        );
    }
    
    return tokenId;
};

// Static method to create inventory with auto-incremented tokenId (for mintable NFTs)
inventorySchema.statics.createWithTokenId = async function(data) {
    const tokenId = await this.getNextTokenId();
    return await this.create({ ...data, tokenId });
};

// Static method to create inventory for non-mintable items (starts at 1,000,000)
inventorySchema.statics.createNonMintable = async function(data) {
    const tokenId = await this.getNextNonMintableTokenId();
    return await this.create({ 
        ...data, 
        tokenId,
        isMintable: false,
        isMinted: false
    });
};

// Pre-save hook to ensure tokenId uniqueness when it exists
inventorySchema.pre('save', async function(next) {
    if (this.tokenId != null && this.isNew) {
        const existing = await this.constructor.findOne({ 
            tokenId: this.tokenId,
            _id: { $ne: this._id }
        });
        if (existing) {
            throw new Error(`TokenId ${this.tokenId} already exists.`);
        }
    }
    next();
});

const Inventory = mongoose.model("Inventory", inventorySchema)

module.exports = Inventory