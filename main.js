const dgram = require("dgram");

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

// Extract the DNS Question Section Dynamically
function extractDNSQuestion(requestBuffer) {
    return requestBuffer.slice(12); // Extract everything after the 12-byte header
}

// Create an Answer Section for a fixed IP (A Record)
function createDNSAnswer() {
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

    // IP Address (93.184.216.34 → example fixed IP)
    answer.writeUInt8(93, 12);
    answer.writeUInt8(184, 13);
    answer.writeUInt8(216, 14);
    answer.writeUInt8(34, 15);

    return answer;
}

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (buf, rinfo) => {
  try {
    const responseHeader = createDNSHeader(buf);
    const responseQuestion = extractDNSQuestion(buf);
    const responseAnswer = createDNSAnswer();

    const response = Buffer.concat([responseHeader, responseQuestion, responseAnswer]);
    udpSocket.send(response, rinfo.port, rinfo.address); // Send back response
  } catch (e) {
    console.log(`Error receiving data: ${e}`);
  }
});

udpSocket.on("error", (err) => {
  console.log(`Error: ${err}`);
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});
