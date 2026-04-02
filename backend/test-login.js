import bcrypt from 'bcryptjs';
import db from './src/config/firebase.js';

const test = async () => {
    const snap = await db.collection('users').where('username', '==', 'admin').get();
    if (snap.empty) {
        console.log('User not found in DB');
        return;
    }
    const user = { id: snap.docs[0].id, ...snap.docs[0].data() };
    console.log('User found:', user.username);
    const isMatch = await bcrypt.compare('admin1234', user.password);
    console.log('Password match:', isMatch);
    process.exit(0);
};
test();
