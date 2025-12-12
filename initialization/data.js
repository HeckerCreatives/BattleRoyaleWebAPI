const marketdata = [
    //#region ENERGY ITEMS
    {
        itemid: "ENG-001",
        itemname: "energy +1",
        description: "Adds 1 energy to your account.",
        amount: "10",
        currency: "points",
        type: "energy",
        consumable: "1",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/energy_potion_1.png"
    },
    {
        itemid: "ENG-002",
        itemname: "energy +3",
        description: "Adds 3 energy to your account.",
        amount: "25",
        currency: "points",
        type: "energy",
        consumable: "3",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/energy_potion_3.png",
    },
    {
        itemid: "ENG-003",
        itemname: "energy +5",
        description: "Adds 5 energy to your account.",
        amount: "40",
        currency: "points",
        type: "energy",
        consumable: "5",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/energy_potion_5.png"
    },
    {
        itemid: "ENG-004",
        itemname: "energy +10",
        description: "Adds 10 energy to your account.",
        amount: "75",
        currency: "points",
        type: "energy",
        consumable: "10",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/energy_potion_10.png"
    },
    //#endregion
    //#region XP potionS
    {
        itemid: "XPPOT-001",
        itemname: "XP Potion x2",
        description: "Doubles XP gain for 24 hours.",
        amount: "50",
        currency: "coins",
        type: "potion",
        consumable: "2",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/xp_potion_x2.png"
    },
    {
        itemid: "XPPOT-002",
        itemname: "XP Potion x4",
        description: "Quadruples XP gain for 24 hours.",
        amount: "100",
        currency: "coins",
        type: "potion",
        consumable: "4",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/xp_potion_x4.png"
    },
    {
        itemid: "XPPOT-003",
        itemname: "XP Potion x6",
        description: "6x XP gain for 24 hours.",
        amount: "150",
        currency: "coins",
        type: "potion",
        consumable: "6",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/xp_potion_x6.png"
        
    },
    {
        itemid: "XPPOT-004",
        itemname: "XP Potion x10",
        description: "10x XP gain for 24 hours.",
        amount: "250",
        currency: "coins",
        type: "potion",
        consumable: "10",
        ipfsImage: "https://gateway.pinata.cloud/ipfs/bafybeihhvi76az4xjhrv6cv2d6hkmr3ocheol5eos2igxnroixaymthlxm/xp_potion_x10.png"
    },
    //#endregion
    //#region TITLES
    // {
    //     itemid: "TITLE-000",
    //     itemname: "RISE OF FEARLESS",
    //     description: "Awarded to the top killer.",
    //     amount: "0",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Common"
    // },
    // {
    //     itemid: "TITLE-001",
    //     itemname: "KILLING KING",
    //     description: "Awarded to the top killer.",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-002",
    //     itemname: "ULTIMATE PLAYER",
    //     description: "Awarded to the ultimate player.",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-003",
    //     itemname: "GRIM REAPER",
    //     description: "Awarded for most deaths.",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-004",
    //     itemname: "Fearless",
    //     description: "Awarded for the players who are not afraid to face death.",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-005",
    //     itemname: "The Dune Phantom",
    //     description: "",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-006",
    //     itemname: "Lion of Mali",
    //     description: "",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-007",
    //     itemname: "Mansa's Shield",
    //     description: "",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-008",
    //     itemname: "Spear of Shaka",
    //     description: "",
    //     amount: "750",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Legendary"
    // },
    // {
    //     itemid: "TITLE-009",
    //     itemname: "Ethiopian Marksman",
    //     description: "",
    //     amount: "500",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Epic"
    // },
    // {
    //     itemid: "TITLE-010",
    //     itemname: "Rift Valley Sniper",
    //     description: "",
    //     amount: "500",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Epic"
    // },
    // {
    //     itemid: "TITLE-011",
    //     itemname: "Zambezi Marksman",
    //     description: "",
    //     amount: "500",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Epic"
    // },
    // {
    //     itemid: "TITLE-012",
    //     itemname: "Oya's Warrior",
    //     description: "",
    //     amount: "500",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Epic"
    // },
    // {
    //     itemid: "TITLE-013",
    //     itemname: "Dahomey Champion",
    //     description: "",
    //     amount: "500",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Epic"
    // },
    // {
    //     itemid: "TITLE-014",
    //     itemname: "African Hawkeye",
    //     description: "",
    //     amount: "250",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Uncommon"
    // },
    // {
    //     itemid: "TITLE-015",
    //     itemname: "The Lion's Roar",
    //     description: "",
    //     amount: "250",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Uncommon"
    // },
    // {
    //     itemid: "TITLE-016",
    //     itemname: "Zulu Warrior",
    //     description: "",
    //     amount: "250",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Uncommon"
    // },
    // {
    //     itemid: "TITLE-017",
    //     itemname: "Nigerian Vanguard",
    //     description: "",
    //     amount: "250",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Uncommon"
    // },
    // {
    //     itemid: "TITLE-018",
    //     itemname: "Head Hunter",
    //     description: "",
    //     amount: "250",
    //     currency: "points",
    //     type: "title",
    //     consumable: "0",
    //     rarity: "Uncommon"
    // }
    //#endregion
];

const titlesdata = [
    {
        category: "kill",
        index: "TITLE-000",
        name: "Rise of Fearless",
        description: "Title for new players",
        rarity: "Legendary"
    },
    {
        category: "kill",
        index: "TITLE-001",
        name: "KILLING KING",
        description: "Awarded to the top killer.",
        rarity: "Legendary"
    },
    {
        category: "kill",
        index: "TITLE-002",
        name: "ULTIMATE PLAYER",
        description: "Awarded to the ultimate player.",
        rarity: "Legendary"
    },
    {
        category: "death",
        index: "TITLE-003",
        name: "GRIM REAPER",
        description: "Awarded for most deaths.",
        rarity: "Legendary"
    }
]

module.exports = {marketdata, titlesdata};
