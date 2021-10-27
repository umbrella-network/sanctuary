// import 'reflect-metadata';
// import { loadTestEnv } from '../../helpers';
// import { setupDatabase, teardownDatabase } from '../../helpers/databaseHelpers';
// import chai, { expect } from 'chai';
// import { getTestContainer } from '../../helpers/getTestContainer';
// import { ProfileController } from '../../../src/controllers/ProfileController';
// import chaiHttp from 'chai-http';
// import { getContainer } from '../../../src/lib/getContainer';
// import { ManagementClient } from 'auth0';
// import sinon, { SinonStubbedInstance } from 'sinon';
// import { Container } from 'inversify';
// import { MetricsMiddleware } from '../../../src/middleware/MetricsMiddleware';
// import { UserRepository } from '../../../src/repositories/UserRepository';
//
// chai.use(chaiHttp);
//
// describe('/profile', async () => {
//   let container: Container;
//   let instance: ProfileController;
//
//
//   before(async () => {
//     container = getContainer();
//     // const auth0Client = sinon.createStubInstance(ManagementClient);
//     //
//     // auth0Client.getUser.resolves({
//     //   _id: 'USER_ID',
//     //   email: 'user@example.com',
//     //   name: 'John Doe',
//     // });
//
//     container
//       .rebind<ManagementClient>('Auth0ManagementClient')
//       .toDynamicValue(() => <ManagementClient><unknown>auth0Client)
//       .inSingletonScope();
//   });
//
//   after(async () => {
//     sinon.restore();
//   });
//
//   describe('GET /', async () => {
//     before(async () => {
//       instance = container.get(ProfileController);
//     });
//
//     describe('when no authentication token is provided', async () => {
//       it('returns HTTP 401 Unauthorized', async () => {
//         const res = await chai.request(instance.router).get('/');
//         console.log('---------');
//         console.log(res);
//         console.log('---------');
//       });
//     });
//
//     // describe('when a valid token is provided', async () => {
//     //   it('returns the user profile', async () => {
//     //     // TODO
//     //   });
//     // });
//   });
// });
//
