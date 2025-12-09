const mongoose = require("mongoose")

const inventorySchema = new mongoose.Schema(
    {
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

const Inventory = mongoose.model("Inventory", inventorySchema)

module.exports = Inventory