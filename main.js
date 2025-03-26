const dgram = require("dgram");
const dns = require("dns");

const udpSocket = dgram.createSocket("udp4");

function createDNSHeader(requestBuffer) {
    const header = Buffer.alloc(12);
    const transactionId = requestBuffer.readUInt16BE(0); 

    header.writeUInt16BE(transactionId, 0);
    header.writeUInt16BE(0x8180, 2);
    header.writeUInt16BE(1, 4);
    header.writeUInt16BE(1, 6);
    header.writeUInt16BE(0, 8);
    header.writeUInt16BE(0, 10);

    return header;
}

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

function createDNSAnswer(ip) {
    const answer = Buffer.alloc(16);

    answer.writeUInt16BE(0xC00C, 0);
    answer.writeUInt16BE(1, 2);
    answer.writeUInt16BE(1, 4);
    answer.writeUInt32BE(60, 6);
    answer.writeUInt16BE(4, 10);

    const ipParts = ip.split(".").map(Number);
    answer.writeUInt8(ipParts[0], 12);
    answer.writeUInt8(ipParts[1], 13);
    answer.writeUInt8(ipParts[2], 14);
    answer.writeUInt8(ipParts[3], 15);

    return answer;
}

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
            const responseQuestion = buf.slice(12);
            const responseAnswer = createDNSAnswer(addresses[0]);

            const response = Buffer.concat([responseHeader, responseQuestion, responseAnswer]);
            udpSocket.send(response, rinfo.port, rinfo.address);
        });
    } catch (e) {
        console.log(`Error processing request: ${e}`);
    }
});

udpSocket.bind(53, "127.0.0.1", () => {
    console.log("DNS Server listening on 127.0.0.1:53");
});
