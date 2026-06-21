const prisma = require('../../src/utils/prisma');
const driverService = require('../../src/modules/drivers/driver.service');

jest.mock('../../src/utils/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  driver: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
}));

describe('driver.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDriver', () => {
    it('creates a driver profile and upgrades the user role', async () => {
      const user = { id: 'user-1', role: 'RIDER' };
      const driver = { id: 'driver-1', user_id: 'user-1' };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.driver.findUnique.mockResolvedValue(null);
      prisma.driver.create.mockReturnValue('create-driver-query');
      prisma.user.update.mockReturnValue('update-user-query');
      prisma.$transaction.mockResolvedValue([driver, { ...user, role: 'DRIVER' }]);

      await expect(driverService.registerDriver('user-1', { is_women_ride_enabled: true })).resolves.toEqual({
        driver,
        created: true,
      });

      expect(prisma.driver.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          is_women_ride_enabled: true,
        },
        include: { user: { select: { id: true, phone: true, name: true } } },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'DRIVER' },
      });
    });

    it('returns an existing driver profile instead of throwing DRIVER_EXISTS', async () => {
      const user = { id: 'user-1', role: 'DRIVER' };
      const driver = { id: 'driver-1', user_id: 'user-1', user: { id: 'user-1', phone: '9999999999', name: 'Rido' } };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.driver.findUnique.mockResolvedValue(driver);

      await expect(driverService.registerDriver('user-1')).resolves.toEqual({
        driver,
        created: false,
      });

      expect(prisma.driver.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('repairs the user role when an existing driver profile belongs to a rider user', async () => {
      const user = { id: 'user-1', role: 'RIDER' };
      const driver = { id: 'driver-1', user_id: 'user-1' };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.driver.findUnique.mockResolvedValue(driver);
      prisma.user.update.mockResolvedValue({ ...user, role: 'DRIVER' });

      await expect(driverService.registerDriver('user-1')).resolves.toEqual({
        driver,
        created: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'DRIVER' },
      });
      expect(prisma.driver.create).not.toHaveBeenCalled();
    });
  });
});
