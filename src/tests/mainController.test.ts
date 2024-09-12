import { MainController } from '../controller/MainController';
import { Request, Response, NextFunction } from 'express';
import { Channel } from 'amqplib'; // Assuming Channel is from amqplib if using RabbitMQ
jest.mock('../controller/UserController'); // Adjust the path
const userController = require('../controller/UserController');
userController.all = jest.fn().mockResolvedValue([{id: "db993bc4-9f83-43e1-9508-6eabda5de0e9",
        email: "kjansddnla",
        name: "Técnico test",
        hash: "$2b$10$NXeoJvcSs2fyT.J8Y0ez0OxO.JOSn7De1SKUG8Wzc6PvSA5XrQr/e",
        isActive: true,
        isSuspended: false,
        isPending: false,
        activationToken: null,
        activationExpire: null,
        profilePic: "default_profile.png",
        typeExternal: null,
        externalId: null,
        lastLogin: null,
        createdAt: "2024-09-05T07:25:40.654Z",
        updatedAt: "2024-09-05T07:26:11.398Z",
        roles: "Core, Tech"}]);

describe('MainController - usersAll', () => {
    let mainController: MainController;

    beforeEach(() => {
        mainController = new MainController();
    });

    it('should return users when a valid request is made', async () => {
        const req = {
            body: { user: { roles: ['Admin'] } }
        } as Request;

        const res = {
            status: jest.fn(),
            json: jest.fn()
        } as unknown as Response;

        const next: NextFunction = jest.fn();
        const channel: Channel = jest.fn() as unknown as Channel;

        const users = await mainController.usersAll(req, res, next, channel);

        // Make assertions
        expect(users).toBeDefined();
        expect(Array.isArray(users)).toBe(true);
    });

    it('should return error when user is not authenticated', async () => {
        const req = { body: {} } as Request;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;

        const next: NextFunction = jest.fn();
        const channel: Channel = jest.fn() as unknown as Channel;

        const result = await mainController.usersAll(req, res, next, channel);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(result).toEqual({ message: 'Error: Usuario no autenticado' });
    });
});