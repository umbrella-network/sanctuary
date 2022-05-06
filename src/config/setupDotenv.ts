import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'testing' ? '.testing.env' : '.env' });
