import { createServer, STATUS_CODES } from 'node:http';

const requestCounts = new Map();
const plainTextHeader = { 'Content-Type': 'text/plain' };
const exactPathHandlers = new Map([
	[
		'/hangup-once',
		({ count, response }) => {
			if (count === 1) {
				response.socket.destroy();
				return;
			}

			response.writeHead(200, plainTextHeader);
			response.end('ok after hangup');
		}
	],
	[
		'/retry-429',
		({ count, response }) => {
			if (count === 1) {
				response.writeHead(429, plainTextHeader);
				response.end('rate limited');
				return;
			}

			response.writeHead(200, plainTextHeader);
			response.end('ok after 429');
		}
	],
	[
		'/retry-500',
		({ count, response }) => {
			if (count === 1) {
				response.writeHead(500, plainTextHeader);
				response.end('retry me');
				return;
			}

			response.writeHead(200, plainTextHeader);
			response.end('ok after 500');
		}
	]
]);

const server = createServer((request, response) => {
	const url = new URL(request.url, 'http://localhost');
	const requestKey = `${url.pathname}${url.search}`;
	const count = (requestCounts.get(requestKey) ?? 0) + 1;

	requestCounts.set(requestKey, count);

	const exactPathHandler = exactPathHandlers.get(url.pathname);

	if (exactPathHandler) {
		exactPathHandler({ count, response });
		return;
	}

	if (/^\/status\/\d+$/.test(url.pathname)) {
		const status = Number(url.pathname.split('/').at(-1));
		response.writeHead(status, plainTextHeader);
		response.end(STATUS_CODES[status] ?? 'Unknown');
		return;
	}

	response.writeHead(404, plainTextHeader);
	response.end('Not Found');
});

server.listen(() => {
	if (!process.send) {
		return;
	}

	process.send({
		ready: true,
		port: server.address().port
	});
});

process.on('SIGINT', () => {
	server.close(() => process.exit(0));
});
