const dgram = require("dgram");
const dns = require("dns");

// Create UDP socket
const udpSocket = dgram.createSocket("udp4");

// DNS Header Section
function createDNSHeader(requestBuffer) {
    const header = Buffer.alloc(12);
    const transactionId = requestBuffer.readUInt16BE(0); // Extract Transaction ID

    header.writeUInt16BE(transactionId, 0); // Use same transaction ID
    header.writeUInt16BE(0x8180, 2); // Flags: Response, No error
    header.writeUInt16BE(1, 4); // QDCOUNT: 1 (one question)
    header.writeUInt16BE(1, 6); // ANCOUNT: 1 (one answer)
    header.writeUInt16BE(0, 8); // NSCOUNT: 0
    header.writeUInt16BE(0, 10); // ARCOUNT: 0

    return header;
}

// Extract domain name from request buffer
function extractDomainName(requestBuffer) {
    let offset = 12;
    let domainParts = [];
    
    while (requestBuffer[offset] !== 0) {
        let length = requestBuffer[offset];
        domainParts.push(requestBuffer.slice(offset + 1, offset + 1 + length).toString());
        offset += length + 1;
    }

    return domainParts.join(".");
}

// Create an Answer Section for a given IP
function createDNSAnswer(ip) {
    const answer = Buffer.alloc(16);

    // Name (Pointer to question section: 0xC00C)
    answer.writeUInt16BE(0xC00C, 0);

    // Type (A record = 1)
    answer.writeUInt16BE(1, 2);

    // Class (IN = 1)
    answer.writeUInt16BE(1, 4);

    // TTL (Time to Live: 60 seconds)
    answer.writeUInt32BE(60, 6);

    // Data length (IPv4 address = 4 bytes)
    answer.writeUInt16BE(4, 10);

    // Convert IP to bytes
    const ipParts = ip.split(".").map(Number);
    answer.writeUInt8(ipParts[0], 12);
    answer.writeUInt8(ipParts[1], 13);
    answer.writeUInt8(ipParts[2], 14);
    answer.writeUInt8(ipParts[3], 15);

    return answer;
}

// Handle incoming DNS requests
udpSocket.on("message", (buf, rinfo) => {
    try {
        const domain = extractDomainName(buf);
        console.log(`Resolving: ${domain}`);

        dns.resolve4(domain, (err, addresses) => {
            if (err || addresses.length === 0) {
                console.log(`Error resolving ${domain}: ${err}`);
                return;
            }

            const responseHeader = createDNSHeader(buf);
            const responseQuestion = buf.slice(12); // Keep question section unchanged
            const responseAnswer = createDNSAnswer(addresses[0]); // Use first resolved IP

            const response = Buffer.concat([responseHeader, responseQuestion, responseAnswer]);
            udpSocket.send(response, rinfo.port, rinfo.address);
        });
    } catch (e) {
        console.log(`Error processing request: ${e}`);
    }
});

// Start server
udpSocket.bind(53, "127.0.0.1", () => {
    console.log("DNS Server listening on 127.0.0.1:53");
});
