import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { SchedulesService } from './schedules.service';
import { Schedule } from './schemas/schedule.schema';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let scheduleModel: any;
  let workflowQueue: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockWorkflowId = new Types.ObjectId().toString();
  const mockScheduleId = new Types.ObjectId().toString();
  const validCronExpression = '0 9 * * *';

  beforeEach(async () => {
    const mockScheduleModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    };

    const mockWorkflowQueue = {
      add: jest.fn().mockResolvedValue({
        id: 'mock-job-id',
        opts: { repeat: { key: 'repeatable-key-123' } },
      }),
      removeRepeatableByKey: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: getModelToken(Schedule.name), useValue: mockScheduleModel },
        { provide: getQueueToken('workflow-execution'), useValue: mockWorkflowQueue },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    scheduleModel = module.get(getModelToken(Schedule.name));
    workflowQueue = module.get(getQueueToken('workflow-execution'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create schedule with Bull repeatable job', async () => {
      scheduleModel.findOne.mockResolvedValue(null);

      const createdSchedule = {
        _id: new Types.ObjectId(mockScheduleId),
        workflowId: mockWorkflowId,
        userId: mockUserId,
        cronExpression: validCronExpression,
        isActive: true,
        repeatableJobId: 'repeatable-key-123',
        nextRunAt: expect.any(Date),
      };

      scheduleModel.create.mockResolvedValue(createdSchedule);

      const result = await service.create(mockUserId, mockWorkflowId, validCronExpression);

      expect(workflowQueue.add).toHaveBeenCalledWith(
        { workflowId: mockWorkflowId, userId: mockUserId, triggerSource: 'scheduled' },
        { repeat: { cron: validCronExpression, startDate: expect.any(Date) }, jobId: `schedule_${mockWorkflowId}` },
      );

      expect(scheduleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: mockWorkflowId,
          userId: mockUserId,
          cronExpression: validCronExpression,
          isActive: true,
          repeatableJobId: 'repeatable-key-123',
        }),
      );

      expect(result).toEqual(createdSchedule);
    });

    it('should validate cron expression format', async () => {
      await expect(
        service.create(mockUserId, mockWorkflowId, 'invalid'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(mockUserId, mockWorkflowId, '* * *'),
      ).rejects.toThrow(BadRequestException);

      expect(workflowQueue.add).not.toHaveBeenCalled();
    });

    it('should throw if schedule already exists for workflow', async () => {
      scheduleModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        workflowId: mockWorkflowId,
      });

      await expect(
        service.create(mockUserId, mockWorkflowId, validCronExpression),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByUser', () => {
    it('should find all schedules for user', async () => {
      const mockSchedules = [
        {
          _id: new Types.ObjectId(),
          workflowId: mockWorkflowId,
          userId: mockUserId,
          cronExpression: '0 9 * * *',
          isActive: true,
          save: jest.fn().mockResolvedValue(undefined),
        },
        {
          _id: new Types.ObjectId(),
          workflowId: new Types.ObjectId().toString(),
          userId: mockUserId,
          cronExpression: '0 18 * * *',
          isActive: false,
          save: jest.fn().mockResolvedValue(undefined),
        },
      ];

      scheduleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSchedules),
      });

      const result = await service.findAllByUser(mockUserId);

      expect(scheduleModel.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete schedule and remove Bull job', async () => {
      const existingSchedule = {
        _id: new Types.ObjectId(mockScheduleId),
        workflowId: mockWorkflowId,
        userId: mockUserId,
        repeatableJobId: 'repeatable-key-123',
      };

      scheduleModel.findOne.mockResolvedValue(existingSchedule);
      scheduleModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.delete(mockScheduleId, mockUserId);

      expect(workflowQueue.removeRepeatableByKey).toHaveBeenCalledWith('repeatable-key-123');
      expect(scheduleModel.deleteOne).toHaveBeenCalledWith({
        _id: mockScheduleId,
        userId: mockUserId,
      });
    });

    it('should throw NotFoundException if schedule not found', async () => {
      scheduleModel.findOne.mockResolvedValue(null);

      await expect(service.delete(mockScheduleId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggle', () => {
    it('should toggle schedule active status to false and remove Bull job', async () => {
      const existingSchedule = {
        _id: new Types.ObjectId(mockScheduleId),
        workflowId: mockWorkflowId,
        userId: mockUserId,
        cronExpression: validCronExpression,
        isActive: true,
        repeatableJobId: 'repeatable-key-123',
        save: jest.fn().mockResolvedValue(undefined),
      };

      scheduleModel.findOne.mockResolvedValue(existingSchedule);

      const result = await service.toggle(mockScheduleId, mockUserId, false);

      expect(workflowQueue.removeRepeatableByKey).toHaveBeenCalledWith('repeatable-key-123');
      expect(existingSchedule.isActive).toBe(false);
      expect(existingSchedule.repeatableJobId).toBeUndefined();
      expect(existingSchedule.save).toHaveBeenCalled();
    });

    it('should toggle schedule active status to true and create Bull job', async () => {
      const existingSchedule = {
        _id: new Types.ObjectId(mockScheduleId),
        workflowId: mockWorkflowId,
        userId: mockUserId,
        cronExpression: validCronExpression,
        isActive: false,
        repeatableJobId: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      };

      scheduleModel.findOne.mockResolvedValue(existingSchedule);

      const result = await service.toggle(mockScheduleId, mockUserId, true);

      expect(workflowQueue.add).toHaveBeenCalledWith(
        { workflowId: mockWorkflowId, userId: mockUserId, triggerSource: 'scheduled' },
        expect.objectContaining({
          repeat: { cron: validCronExpression, startDate: expect.any(Date) },
        }),
      );
      expect(existingSchedule.isActive).toBe(true);
      expect(existingSchedule.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if schedule not found', async () => {
      scheduleModel.findOne.mockResolvedValue(null);

      await expect(service.toggle(mockScheduleId, mockUserId, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
