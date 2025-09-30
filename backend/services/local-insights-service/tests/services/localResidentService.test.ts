import { LocalResidentService } from '../../src/services/localResidentService';

describe('LocalResidentService', () => {
  let service: LocalResidentService;

  beforeEach(() => {
    service = new LocalResidentService();
  });

  afterEach(async () => {
    await service.clearAllResidents();
  });

  describe('registerResident', () => {
    const validResidentData = {
      userId: 'user123',
      verificationProof: ['hkid_photo.jpg', 'utility_bill.pdf'],
      yearsInHongKong: 5,
      districts: ['Central', 'Wan Chai'],
      languages: ['English', 'Cantonese'],
      specialties: ['food', 'culture']
    };

    it('should register a new resident successfully', async () => {
      const resident = await service.registerResident(validResidentData);

      expect(resident).toBeDefined();
      expect(resident.userId).toBe(validResidentData.userId);
      expect(resident.verificationStatus).toBe('pending');
      expect(resident.yearsInHongKong).toBe(validResidentData.yearsInHongKong);
      expect(resident.districts).toEqual(validResidentData.districts);
      expect(resident.credibilityScore).toBeGreaterThan(0);
    });

    it('should calculate initial credibility score correctly', async () => {
      const resident = await service.registerResident(validResidentData);
      
      // Base score (50) + years (10) + districts (4) + languages (6) + specialties (4) = 74
      expect(resident.credibilityScore).toBe(74);
    });

    it('should throw error for insufficient years in Hong Kong', async () => {
      const invalidData = { ...validResidentData, yearsInHongKong: 0 };
      
      await expect(service.registerResident(invalidData))
        .rejects.toThrow('Must have lived in Hong Kong for at least 1 year');
    });

    it('should throw error for empty districts', async () => {
      const invalidData = { ...validResidentData, districts: [] };
      
      await expect(service.registerResident(invalidData))
        .rejects.toThrow('Must specify at least one district');
    });

    it('should throw error for empty verification proof', async () => {
      const invalidData = { ...validResidentData, verificationProof: [] };
      
      await expect(service.registerResident(invalidData))
        .rejects.toThrow('Must provide verification proof');
    });

    it('should throw error for duplicate registration', async () => {
      await service.registerResident(validResidentData);
      
      await expect(service.registerResident(validResidentData))
        .rejects.toThrow('User is already registered as a local resident');
    });
  });

  describe('verifyResident', () => {
    let residentId: string;

    beforeEach(async () => {
      const resident = await service.registerResident({
        userId: 'user123',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });
      residentId = resident.id;
    });

    it('should verify resident successfully', async () => {
      const verifiedResident = await service.verifyResident(residentId, 'verified');

      expect(verifiedResident.verificationStatus).toBe('verified');
      expect(verifiedResident.verificationDate).toBeDefined();
    });

    it('should reject resident successfully', async () => {
      const rejectedResident = await service.verifyResident(residentId, 'rejected');

      expect(rejectedResident.verificationStatus).toBe('rejected');
      expect(rejectedResident.verificationDate).toBeDefined();
    });

    it('should throw error for non-existent resident', async () => {
      await expect(service.verifyResident('invalid_id', 'verified'))
        .rejects.toThrow('Resident not found');
    });

    it('should throw error for already verified resident', async () => {
      await service.verifyResident(residentId, 'verified');
      
      await expect(service.verifyResident(residentId, 'verified'))
        .rejects.toThrow('Resident verification status is not pending');
    });
  });

  describe('getResidentProfile', () => {
    it('should return resident profile', async () => {
      const resident = await service.registerResident({
        userId: 'user123',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });

      const profile = await service.getResidentProfile(resident.id);

      expect(profile).toEqual(resident);
    });

    it('should throw error for non-existent resident', async () => {
      await expect(service.getResidentProfile('invalid_id'))
        .rejects.toThrow('Resident not found');
    });
  });

  describe('getResidentByUserId', () => {
    it('should return resident by user ID', async () => {
      const resident = await service.registerResident({
        userId: 'user123',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });

      const foundResident = await service.getResidentByUserId('user123');

      expect(foundResident).toEqual(resident);
    });

    it('should return null for non-existent user', async () => {
      const resident = await service.getResidentByUserId('invalid_user');

      expect(resident).toBeNull();
    });
  });

  describe('updateResidentProfile', () => {
    let residentId: string;

    beforeEach(async () => {
      const resident = await service.registerResident({
        userId: 'user123',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });
      residentId = resident.id;
    });

    it('should update resident profile successfully', async () => {
      const updates = {
        districts: ['Central', 'Wan Chai', 'Tsim Sha Tsui'],
        languages: ['English', 'Cantonese', 'Mandarin'],
        specialties: ['food', 'culture', 'nightlife']
      };

      const updatedResident = await service.updateResidentProfile(residentId, updates);

      expect(updatedResident.districts).toEqual(updates.districts);
      expect(updatedResident.languages).toEqual(updates.languages);
      expect(updatedResident.specialties).toEqual(updates.specialties);
    });

    it('should throw error for non-existent resident', async () => {
      await expect(service.updateResidentProfile('invalid_id', { districts: ['Central'] }))
        .rejects.toThrow('Resident not found');
    });
  });

  describe('adjustCredibilityScore', () => {
    let residentId: string;

    beforeEach(async () => {
      const resident = await service.registerResident({
        userId: 'user123',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });
      residentId = resident.id;
    });

    it('should increase credibility score', async () => {
      const originalResident = await service.getResidentProfile(residentId);
      const updatedResident = await service.adjustCredibilityScore(residentId, 10);

      expect(updatedResident.credibilityScore).toBe(originalResident.credibilityScore + 10);
    });

    it('should decrease credibility score', async () => {
      const originalResident = await service.getResidentProfile(residentId);
      const updatedResident = await service.adjustCredibilityScore(residentId, -5);

      expect(updatedResident.credibilityScore).toBe(originalResident.credibilityScore - 5);
    });

    it('should not allow score below 0', async () => {
      const updatedResident = await service.adjustCredibilityScore(residentId, -200);

      expect(updatedResident.credibilityScore).toBe(0);
    });

    it('should not allow score above 100', async () => {
      const updatedResident = await service.adjustCredibilityScore(residentId, 200);

      expect(updatedResident.credibilityScore).toBe(100);
    });

    it('should throw error for non-existent resident', async () => {
      await expect(service.adjustCredibilityScore('invalid_id', 10))
        .rejects.toThrow('Resident not found');
    });
  });

  describe('getVerifiedResidents', () => {
    it('should return only verified residents', async () => {
      const resident1 = await service.registerResident({
        userId: 'user1',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });

      const resident2 = await service.registerResident({
        userId: 'user2',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 5,
        districts: ['Wan Chai'],
        languages: ['Cantonese'],
        specialties: ['culture']
      });

      await service.verifyResident(resident1.id, 'verified');
      await service.verifyResident(resident2.id, 'rejected');

      const verifiedResidents = await service.getVerifiedResidents();

      expect(verifiedResidents).toHaveLength(1);
      expect(verifiedResidents[0].id).toBe(resident1.id);
    });
  });

  describe('getResidentsByDistrict', () => {
    it('should return residents by district', async () => {
      const resident1 = await service.registerResident({
        userId: 'user1',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central', 'Wan Chai'],
        languages: ['English'],
        specialties: ['food']
      });

      const resident2 = await service.registerResident({
        userId: 'user2',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 5,
        districts: ['Tsim Sha Tsui'],
        languages: ['Cantonese'],
        specialties: ['culture']
      });

      await service.verifyResident(resident1.id, 'verified');
      await service.verifyResident(resident2.id, 'verified');

      const centralResidents = await service.getResidentsByDistrict('Central');

      expect(centralResidents).toHaveLength(1);
      expect(centralResidents[0].id).toBe(resident1.id);
    });
  });

  describe('getResidentsBySpecialty', () => {
    it('should return residents by specialty', async () => {
      const resident1 = await service.registerResident({
        userId: 'user1',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food', 'culture']
      });

      const resident2 = await service.registerResident({
        userId: 'user2',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 5,
        districts: ['Wan Chai'],
        languages: ['Cantonese'],
        specialties: ['nightlife']
      });

      await service.verifyResident(resident1.id, 'verified');
      await service.verifyResident(resident2.id, 'verified');

      const foodExperts = await service.getResidentsBySpecialty('food');

      expect(foodExperts).toHaveLength(1);
      expect(foodExperts[0].id).toBe(resident1.id);
    });
  });

  describe('getPendingVerifications', () => {
    it('should return only pending residents', async () => {
      const resident1 = await service.registerResident({
        userId: 'user1',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 3,
        districts: ['Central'],
        languages: ['English'],
        specialties: ['food']
      });

      const resident2 = await service.registerResident({
        userId: 'user2',
        verificationProof: ['proof.jpg'],
        yearsInHongKong: 5,
        districts: ['Wan Chai'],
        languages: ['Cantonese'],
        specialties: ['culture']
      });

      await service.verifyResident(resident1.id, 'verified');

      const pendingResidents = await service.getPendingVerifications();

      expect(pendingResidents).toHaveLength(1);
      expect(pendingResidents[0].id).toBe(resident2.id);
    });
  });
});