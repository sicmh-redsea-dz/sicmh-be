import { Request, Response } from 'express';
import { UserService } from '../services/user.srvc';

const userService = new UserService();

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.findAll();
  res.status(201).json(users);
};