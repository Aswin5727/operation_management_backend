import express from 'express';
import { authenticate } from '../../common/middlewares/authenticate.js';
import { authorize } from '../../common/middlewares/authorize.js';
import asyncHandler from '../../common/utils/asyncHandler.js';
import { createBranchHoliday, deleteBranchHoliday, listBranchHolidays, updateBranchHoliday } from './branchHolidays.service.js';
import { syncTamilNaduHolidayYear } from './holidaySync.service.js';

const router = express.Router();
router.use(authenticate, authorize('BRANCH_ADMIN'));
router.get('/', asyncHandler(async (req, res) => res.json({ data: await listBranchHolidays(req.user, req.query) })));
router.post('/sync', asyncHandler(async (req, res) => res.json({ data: await syncTamilNaduHolidayYear(req.body?.year || new Date().getFullYear()) })));
router.post('/', asyncHandler(async (req, res) => res.status(201).json({ data: await createBranchHoliday(req.user, req.body) })));
router.patch('/:id', asyncHandler(async (req, res) => res.json({ data: await updateBranchHoliday(req.user, req.params.id, req.body) })));
router.delete('/:id', asyncHandler(async (req, res) => res.json({ data: await deleteBranchHoliday(req.user, req.params.id) })));
export default router;
