import * as http from 'node:http'

const HOST = '127.0.0.1';
const PORT = '8000';

const mockResponseData = {
	code: 200,
	message: "mock mock mock",
	data: {
		result: "success! (mock)",
		success: true,
	}
}

const server = http.createServer((req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');

	if (req.url === '/analyze' && req.method === 'POST') {
		let body = '';
		req.on('data', chunk => {
			body += chunk.toString();
		});

		req.on('end', () => {
			console.log("POST Request recieved\n", body);
			res.writeHead(200);
			res.end(JSON.stringify(mockResponseData.data));
		});
	} else {
		res.writeHead(404);
		res.end(JSON.stringify({error: "Not Found"}));
	}
	
});

server.listen(PORT, HOST, () => {
	console.log(`mock server running at http://${HOST}:${PORT}`);
})
