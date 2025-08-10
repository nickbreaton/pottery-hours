import { ManagedRuntime } from 'effect';
import { ScheduleRepo } from './ScheduleRepo';

export const runtime = ManagedRuntime.make(ScheduleRepo.Default);
