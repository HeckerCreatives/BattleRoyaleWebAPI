const axios = require("axios");


exports.updatefilemetadata = async (req, res) => {
    const { id, username } = req.user;
    const { ipfsPinHash, name, keyvalues } = req.body;

    if (!ipfsPinHash) {
        return res.status(400).json({ message: "failed", data: "IPFS hash is required." });
    }

    const url = `https://api.pinata.cloud/pinning/hashMetadata`;

    const body = JSON.stringify({
        ipfsPinHash,
        name,
        keyvalues,
    });

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${process.env.PINATA_JWT}`,
                "Content-Type": "application/json",
            },
            body,
        });

        if (!response.ok) {
            return res.status(400).json({ message: "failed", data: `Failed to update metadata: ${response.statusText}` });
        }

        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
            const result = await response.json();
            return res.json({ message: "success", data: result });
        } else {
            const textResult = await response.text();
            return res.json({ message: "success", data: textResult });
        }
    } catch (error) {
        console.log(`Error updating metadata on Pinata for ${username}: ${error}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem updating metadata." });
    }
};

exports.uploadmetadata = async (req, res) => {
    const { id, username } = req.user;
    const { metadata } = req.body;

    if (!metadata) {
        return res.status(400).json({ message: "failed", data: "Metadata is required." });
    }

    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

    console.log(process.env.PINATA_JWT);
    try {
        const response = await axios.post(
            url,
            {
                pinataContent: metadata,
                pinataOptions: {
                    cidVersion: 1,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PINATA_JWT}`,
                    "Content-Type": "application/json",
                },
            }
        );


        return res.json({ message: "success", data: { ipfsHash: response.data.IpfsHash } });
    } catch (error) {
        console.log(`Error uploading metadata to Pinata for ${username}: ${error}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem uploading metadata." });
    }
};

exports.unpin = async (req, res) => {
    const { id, username } = req.user;
    const { ipfsHash } = req.body;

    if (!ipfsHash) {
        return res.status(400).json({ message: "failed", data: "IPFS hash is required." });
    }

    const url = `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${process.env.PINATA_JWT}`,
            },
        });

        if (response.ok) {
            return res.json({ message: "success", data: "File unpinned successfully." });
        } else {
            return res.status(400).json({ message: "failed", data: "Failed to unpin file." });
        }
    } catch (err) {
        console.log(`Error unpinning from Pinata for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem unpinning file." });
    }
};