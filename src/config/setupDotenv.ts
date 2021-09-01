import dotenv from 'dotenv';
dotenv.config();

(async () => {
  if (process.env.NODE_ENV === 'testing') {
    await dotenv.config({ path: '.testing.env' });
  } else {
    await dotenv.config();
  }
})();
