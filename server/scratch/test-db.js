import net from 'net';

console.log('Testing connection to Supabase pooler...');
const socket = net.createConnection(6543, 'aws-0-eu-west-1.pooler.supabase.com', () => {
  console.log('Successfully connected to 6543!');
  socket.destroy();
});
socket.setTimeout(5000, () => {
  console.log('Connection TIMEOUT on 6543');
  socket.destroy();
});
socket.on('error', (e) => {
  console.log('Connection ERROR:', e.message);
});
