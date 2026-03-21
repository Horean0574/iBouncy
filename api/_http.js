function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}

function methodNotAllowed(res) {
    sendJson(res, 405, { error: "Method Not Allowed" });
}

async function parseJsonBody(req) {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                resolve({});
            }
        });
    });
}

function toDateKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}

module.exports = {
    sendJson,
    methodNotAllowed,
    parseJsonBody,
    toDateKey,
};
