import { WebSocketServer, WebSocket } from 'ws';
const rooms = new Map();
const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
function getRoomColor(roomId) {
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}
export function setupWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        let currentUserId = '';
        let currentRoomId = '';
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                switch (message.type) {
                    case 'join':
                        handleJoin(ws, message, (uid, rid) => { currentUserId = uid; currentRoomId = rid; });
                        break;
                    case 'edit':
                        handleEdit(currentRoomId, currentUserId, message);
                        break;
                    case 'cursor':
                        handleCursor(currentRoomId, currentUserId, message);
                        break;
                    case 'leave':
                        handleLeave(currentRoomId, currentUserId);
                        break;
                }
            }
            catch (e) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });
        ws.on('close', () => {
            if (currentRoomId && currentUserId) {
                handleLeave(currentRoomId, currentUserId);
            }
        });
    });
    console.log('WebSocket collaboration server ready on /ws');
}
function handleJoin(ws, msg, setIds) {
    const { documentId, userId, userName } = msg;
    const roomId = `doc:${documentId}`;
    setIds(userId, roomId);
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { id: roomId, documentId, clients: new Map() });
    }
    const room = rooms.get(roomId);
    room.clients.set(userId, {
        ws,
        userId,
        userName: userName || 'Anonymous',
        color: getRoomColor(roomId),
    });
    broadcast(roomId, {
        type: 'user_joined',
        userId,
        userName,
        users: Array.from(room.clients.values()).map(c => ({
            userId: c.userId,
            userName: c.userName,
            color: c.color,
        })),
    }, userId);
    ws.send(JSON.stringify({
        type: 'room_state',
        documentId,
        users: Array.from(room.clients.values()).map(c => ({
            userId: c.userId,
            userName: c.userName,
            color: c.color,
        })),
    }));
}
function handleEdit(roomId, userId, msg) {
    broadcast(roomId, {
        type: 'edit',
        userId,
        operation: msg.operation,
        timestamp: Date.now(),
    }, userId);
}
function handleCursor(roomId, userId, msg) {
    broadcast(roomId, {
        type: 'cursor',
        userId,
        position: msg.position,
    }, userId);
}
function handleLeave(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    room.clients.delete(userId);
    if (room.clients.size === 0) {
        rooms.delete(roomId);
    }
    else {
        broadcast(roomId, {
            type: 'user_left',
            userId,
            users: Array.from(room.clients.values()).map(c => ({
                userId: c.userId,
                userName: c.userName,
                color: c.color,
            })),
        });
    }
}
function broadcast(roomId, message, excludeUserId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const data = JSON.stringify(message);
    room.clients.forEach((client, uid) => {
        if (uid !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}
