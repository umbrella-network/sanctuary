import { Factory } from 'rosie';
import { v4 } from 'uuid';
import bcrypt from 'bcrypt';

export const userFactory = Factory
  .define('User')
  .attr('_id', () => v4())
  .sequence('email', (n) => `user${n}@example.com`)
  .attr('verified', true)
  .after(async (user) => {
    user.password = await bcrypt.hash('PASSWORD', 10);
    return user;
  });
