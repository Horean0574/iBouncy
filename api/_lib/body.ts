export async function readJsonBody(req: any): Promise<any> {
    return await new Promise((resolve, reject) => {
        let raw = "";
        req.on("data", (chunk: any) => (raw += String(chunk)));
        req.on("end", () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}
